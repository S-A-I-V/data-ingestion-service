"""
Report Health assembler — joins data from multiple nfc_prod tables into
the ReportHealthPayload response shape.

Data flow:
  1. report_live_state          → report-level delivery state (anchor query)
  2. report_job_mapping         → which jobs belong to each report + DAG wiring
  3. job_definitions            → static job metadata (owners, description)
  4. job_live_state             → runtime status per (job_id, data_date, client_name)
  5. job_live_state (window)    → all data_date rows for the coverage window
                                  → builds run_statuses heatmap
  6. sev1_incidents             → active SEV1s per job+date
  7. sla_policies               → job-level SLA thresholds

All query execution happens via the passed-in connector (no raw psycopg2).
The assembler is pure business logic — no HTTP, no auth, no SQLAlchemy ORM.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any  # noqa: UP035

from fastapi import HTTPException

from app.services.report_health.queries import (
    JOB_DEFINITIONS_TEMPLATE,
    JOB_LIVE_STATE_WINDOW_TEMPLATE,
    REPORT_JOB_MAPPING_TEMPLATE,
    REPORT_LIVE_STATE_BY_DELIVERY_DATE,
    SEV1_INCIDENTS_TEMPLATE,
)
from app.services.report_health.schema import (
    ReportHealthPayload,
    ReportJobResponse,
    ReportLiveStateResponse,
    RunStatusItem,
)

logger = logging.getLogger(__name__)

# Maximum coverage window we'll fetch job_live_state rows for.
# A L+7 report covers 8 data dates; we allow up to 14 to be safe.
MAX_COVERAGE_WINDOW_DAYS = 14


# ── Private helpers ────────────────────────────────────────────────────────────


def _derive_coverage_window(
    coverage_start: date | None,
    coverage_end: date | None,
    anchor_data_date: date,
) -> tuple[date, date]:
    """
    Determine the start/end of the data coverage window for a report.

    If coverage_start/end are stored in report_live_state, use them directly.
    Otherwise fall back to a single-day window (anchor_data_date ± 0).
    Cap the window at MAX_COVERAGE_WINDOW_DAYS to prevent runaway queries.
    """
    start = coverage_start or anchor_data_date
    end = coverage_end or anchor_data_date

    # Clamp to maximum allowed window
    if (end - start).days > MAX_COVERAGE_WINDOW_DAYS:
        end = start + timedelta(days=MAX_COVERAGE_WINDOW_DAYS)

    return start, end


def _build_covered_date_list(window_start: date, window_end: date) -> list[date]:
    """Return a list of every date in [window_start, window_end] inclusive."""
    num_days = (window_end - window_start).days + 1
    return [window_start + timedelta(days=i) for i in range(num_days)]


def _index_by(rows: list[dict], key: str) -> dict[Any, dict]:
    """Index a list of dicts by a single key field. Last row wins on duplicates."""
    return {row[key]: row for row in rows if row.get(key) is not None}


def _build_in_clause(prefix: str, values: list) -> tuple[str, dict]:
    """
    Build a parameterized IN clause with numbered bind params.
    Returns (placeholders_str, params_dict).
    Example: _build_in_clause("jid", [1, 2, 3])
             → (":jid0, :jid1, :jid2", {"jid0": 1, "jid1": 2, "jid2": 3})
    """
    placeholders = ", ".join(f":{prefix}{i}" for i in range(len(values)))
    params = {f"{prefix}{i}": v for i, v in enumerate(values)}
    return placeholders, params


def _normalize_date(raw) -> date:
    """Normalize a date value from DB row — may be str, datetime, or date."""
    if isinstance(raw, str):
        return date.fromisoformat(raw[:10])
    if hasattr(raw, "date"):
        return raw.date()
    return raw


def _index_multi_by(rows: list[dict], key: str) -> dict[Any, list[dict]]:
    """Group a list of dicts into a dict[key → list[row]]."""
    result: dict[Any, list[dict]] = {}
    for row in rows:
        k = row.get(key)
        if k is not None:
            result.setdefault(k, []).append(row)
    return result


def _build_run_statuses(
    job_id: int,
    covered_dates: list[date],
    window_rows_by_job_id: dict[int, list[dict]],
    client_name: str,
) -> list[RunStatusItem]:
    """..."""
    job_window_rows = window_rows_by_job_id.get(job_id, [])
    run_status_by_date: dict[date, dict] = {}

    for row in job_window_rows:
        raw_date = row.get("data_date")
        if raw_date is None:
            continue
        if isinstance(raw_date, str):
            normalized = date.fromisoformat(raw_date[:10])
        elif hasattr(raw_date, "date"):
            normalized = raw_date.date()
        else:
            normalized = raw_date
        run_status_by_date[normalized] = row

    result: list[RunStatusItem] = []
    for data_date in covered_dates:
        row = run_status_by_date.get(data_date)
        if row:
            result.append(
                RunStatusItem(
                    data_date=data_date,
                    status=row.get("current_status", "scheduled"),
                    delay_status=row.get("delay_status", "unknown_state"),
                    completion_percentage=row.get("completion_percentage", 0) or 0,
                    start_time=row.get("start_time"),
                    end_time=row.get("end_time"),
                    client_name=row.get("client_name") or client_name,
                )
            )
        else:
            result.append(
                RunStatusItem(
                    data_date=data_date,
                    status="scheduled",
                    delay_status="unknown_state",
                    completion_percentage=0,
                    start_time=None,
                    end_time=None,
                    client_name=client_name,
                )
            )
    return result


def _compute_run_requirement_summary(
    run_statuses: list[RunStatusItem],
    run_requirement_mode: str,
) -> dict[str, int]:
    """
    Compute required/completed/running/delayed run counts.

    For PER_DATA_DATE: each date is one required run.
    For ONCE_PER_WINDOW: required = 1, completed = 1 if any date is success.
    """
    total = len(run_statuses)

    completed = sum(1 for r in run_statuses if r.status == "success")
    running = sum(1 for r in run_statuses if r.status in ("in_progress", "running"))
    delayed = sum(1 for r in run_statuses if r.delay_status in ("client_delayed", "internal_delayed"))

    if run_requirement_mode == "ONCE_PER_WINDOW":
        return {
            "required_runs": 1,
            "completed_required_runs": 1 if completed > 0 else 0,
            "running_required_runs": 1 if running > 0 and completed == 0 else 0,
            "delayed_required_runs": 1 if delayed > 0 else 0,
        }

    # Default: PER_DATA_DATE
    return {
        "required_runs": total,
        "completed_required_runs": completed,
        "running_required_runs": running,
        "delayed_required_runs": delayed,
    }


def _build_job_response(
    mapping_row: dict,
    definition_row: dict | None,
    live_state_row: dict | None,
    sev1_rows: list[dict],
    run_statuses: list[RunStatusItem],
    covered_dates: list[date],
    anchor_data_date: date,
) -> ReportJobResponse:
    """
    Assemble a single ReportJobResponse from rows across four tables.

    Args:
        mapping_row:     Row from report_job_mapping
        definition_row:  Row from job_definitions (may be None for unmapped jobs)
        live_state_row:  Row from job_live_state for the anchor data_date (may be None)
        sev1_rows:       Rows from sev1_incidents for this job+date
        run_statuses:    Pre-built heatmap items for the coverage window
        covered_dates:   All dates in the window
        anchor_data_date: The report's primary data_date (used for SLA context)
    """
    job_id: int = mapping_row["job_id"]
    job_name: str = mapping_row["job_name"]
    run_mode: str = mapping_row.get("run_requirement_mode") or "PER_DATA_DATE"

    # Live state fields (default to scheduled/unknown if no row exists yet)
    current_status = (live_state_row or {}).get("current_status", "scheduled")
    completion_pct = (live_state_row or {}).get("completion_percentage", 0) or 0
    delay_status = (live_state_row or {}).get("delay_status", "unknown_state")
    delay_mins = (live_state_row or {}).get("delay_duration_minutes", 0) or 0
    start_time = (live_state_row or {}).get("start_time")
    end_time = (live_state_row or {}).get("end_time")
    expected_start = (live_state_row or {}).get("expected_start_time")
    job_sla = (live_state_row or {}).get("job_expected_sla")
    projected_end = (live_state_row or {}).get("projected_end_time")
    run_id = (live_state_row or {}).get("run_id")
    job_url = (live_state_row or {}).get("job_url")
    orchestrator = (live_state_row or {}).get("orchestrator_name")
    message_src = (live_state_row or {}).get("message_source")
    sev1_nums = (live_state_row or {}).get("sev1_numbers")
    sev1_urls = (live_state_row or {}).get("sev1_urls")

    # Merge sev1_incidents rows (incident table takes precedence for detail)
    first_incident = sev1_rows[0] if sev1_rows else None
    sev1_number = first_incident["sev1_number"] if first_incident else None
    sev1_url = first_incident["sev1_url"] if first_incident else None
    gspace_url = first_incident["gspace_url"] if first_incident else None

    # Job definitions metadata
    owner_name = (definition_row or {}).get("job_owner_name")
    oncall_name = (definition_row or {}).get("oncall_name")
    l3_owner = (definition_row or {}).get("l3_owner_name")
    l2_owner = (definition_row or {}).get("l2_owner_name")
    support_dl = (definition_row or {}).get("support_team_dl")
    job_description = (definition_row or {}).get("job_description")

    # DAG wiring: convert FK ID lists to job name strings
    # previous_job_ids and next_job_ids are stored as TEXT (comma-separated IDs)
    # The frontend expects previous_jobs_list / next_jobs_list as names — we
    # store what's available (IDs) and let the frontend resolve if needed.
    # TODO: join against job_definitions to resolve IDs → names in a future pass.
    previous_jobs_list = mapping_row.get("previous_job_ids") or ""
    next_jobs_list = mapping_row.get("next_job_ids") or ""

    run_summary = _compute_run_requirement_summary(run_statuses, run_mode)

    return ReportJobResponse(
        job_id=job_id,
        job_name=job_name,
        sequence_id=mapping_row.get("sequence_id"),
        job_category=mapping_row.get("job_category"),
        is_final_step=bool(mapping_row.get("is_final_step")),
        current_status=current_status,
        job_status=current_status,
        completion_percentage=completion_pct,
        job_completion_percentage=completion_pct,
        delay_status=delay_status,
        delay_duration_minutes=delay_mins,
        job_running_status=delay_status,
        job_state=delay_status,
        start_time=start_time,
        job_start_timestamp=start_time,
        end_time=end_time,
        job_end_timestamp=end_time,
        expected_start_time=expected_start,
        job_expected_sla=job_sla,
        projected_end_time=projected_end,
        last_updated_time=(live_state_row or {}).get("updated_at"),
        sev1_numbers=sev1_nums,
        sev1_urls=sev1_urls,
        sev1_number=sev1_number,
        sev1_url=sev1_url,
        gspace_url=gspace_url,
        previous_jobs_list=previous_jobs_list,
        next_jobs_list=next_jobs_list,
        job_owner_name=owner_name,
        oncall_name=oncall_name,
        L3_owner_name=l3_owner,
        L2_owner_name=l2_owner,
        support_team_DL=support_dl,
        run_id=run_id,
        job_url=job_url,
        orchestrator_name=orchestrator,
        message_source=message_src,
        data_date=anchor_data_date,
        job_description=job_description,
        run_requirement_mode=run_mode,
        covered_data_dates=covered_dates,
        run_statuses=run_statuses,
        **run_summary,
    )


# ── Public API ─────────────────────────────────────────────────────────────────


def assemble_report_health_payloads(
    connector: Any,
    delivery_date: date,
) -> list[ReportHealthPayload]:
    """
    Main entry point: fetch and assemble all report health data for a delivery date.

    Executes queries against nfc_prod in dependency order, then joins
    results in memory to avoid complex cross-table SQL and keep each query
    independently testable.

    Args:
        connector: A db connector with execute_query(sql, params) → list[dict]
        delivery_date: The delivery date to filter on (report_live_state.delivery_date)

    Returns:
        List of ReportHealthPayload, one per report_live_state row.

    Raises:
        HTTPException 404: No reports found for this delivery date.
        HTTPException 500: Query failure on any table.
    """

    # ── Step 1: report_live_state ─────────────────────────────────────────────
    try:
        raw_report_rows = connector.execute_query(
            REPORT_LIVE_STATE_BY_DELIVERY_DATE,
            {"delivery_date": str(delivery_date)},
        )
    except Exception as exc:
        logger.error("report_live_state query failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to query report live state from NFC Prod.",
        ) from exc

    if not raw_report_rows:
        raise HTTPException(
            status_code=404,
            detail=f"No reports scheduled for delivery on {delivery_date}.",
        )

    # ── Step 2: collect IDs needed for downstream queries ────────────────────
    all_report_ids: list[int] = [r["report_id"] for r in raw_report_rows]

    # ── Step 3: report_job_mapping ────────────────────────────────────────────
    try:
        placeholders, params = _build_in_clause("rid", all_report_ids)
        mapping_sql = REPORT_JOB_MAPPING_TEMPLATE.format(report_id_placeholders=placeholders)
        raw_mapping_rows = connector.execute_query(mapping_sql, params)
    except Exception as exc:
        logger.error("report_job_mapping query failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to query report-job mapping from NFC Prod.",
        ) from exc

    # Index: report_id → [mapping_row, ...]
    mappings_by_report_id: dict[int, list[dict]] = _index_multi_by(raw_mapping_rows, "report_id")

    all_job_ids: list[int] = list({r["job_id"] for r in raw_mapping_rows if r.get("job_id")})
    all_job_names: list[str] = list({r["job_name"] for r in raw_mapping_rows if r.get("job_name")})

    if not all_job_ids:
        # Reports exist but no jobs mapped — return report-level data only
        return _build_payloads_without_jobs(raw_report_rows)

    # ── Step 4: job_definitions ───────────────────────────────────────────────
    try:
        placeholders, params = _build_in_clause("jid", all_job_ids)
        definitions_sql = JOB_DEFINITIONS_TEMPLATE.format(job_id_placeholders=placeholders)
        raw_definition_rows = connector.execute_query(definitions_sql, params)
    except Exception as exc:
        logger.error("job_definitions query failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to query job definitions from NFC Prod.",
        ) from exc

    definitions_by_job_id: dict[int, dict] = _index_by(raw_definition_rows, "job_id")

    # ── Step 5: job_live_state (coverage window) ──────────────────────────────
    # Determine the broadest window across all reports in this response.
    # We fetch a single batch covering the union of all windows.
    window_start, window_end = _compute_union_window(raw_report_rows)

    try:
        placeholders, params = _build_in_clause("jid", all_job_ids)
        params["window_start"] = str(window_start)
        params["window_end"] = str(window_end)
        window_sql = JOB_LIVE_STATE_WINDOW_TEMPLATE.format(job_id_placeholders=placeholders)
        raw_window_rows = connector.execute_query(window_sql, params)
    except Exception as exc:
        logger.error("job_live_state window query failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to query job live state window from NFC Prod.",
        ) from exc

    window_rows_by_job_id: dict[int, list[dict]] = _index_multi_by(raw_window_rows, "job_id")

    # Index by (job_id, data_date) for single-date anchor lookups.
    # data_date may come back as a date object OR a datetime/string — normalize it.
    live_state_by_job_date: dict[tuple[int, date], dict] = {}
    for row in raw_window_rows:
        raw_date = row["data_date"]
        if isinstance(raw_date, str):
            # Parse "2026-06-24" or "2026-06-23T18:30:00.000Z" → date
            normalized = date.fromisoformat(raw_date[:10])
        elif hasattr(raw_date, "date"):
            normalized = raw_date.date()
        else:
            normalized = raw_date
        key = (row["job_id"], normalized)
        live_state_by_job_date[key] = row

    # ── Step 6: sev1_incidents ────────────────────────────────────────────────
    # Query for the anchor data_dates present in this response.
    all_anchor_dates: list[date] = list({r["data_date"] for r in raw_report_rows})
    sev1_rows_by_job_name: dict[str, list[dict]] = {}

    for anchor_date in all_anchor_dates:
        try:
            placeholders, params = _build_in_clause("jn", all_job_names)
            params["data_date"] = str(anchor_date)
            sev1_sql = SEV1_INCIDENTS_TEMPLATE.format(job_name_placeholders=placeholders)
            date_sev1_rows = connector.execute_query(sev1_sql, params)
            for row in date_sev1_rows:
                job_name = row["job_name"]
                sev1_rows_by_job_name.setdefault(job_name, []).append(row)
        except Exception as exc:
            # Non-fatal: SEV1 data enhances the view but isn't required
            logger.warning("sev1_incidents query failed for date %s: %s", anchor_date, exc)

    # ── Step 7: assemble payloads ─────────────────────────────────────────────
    payloads: list[ReportHealthPayload] = []

    for report_row in raw_report_rows:
        report_id: int = report_row["report_id"]
        # Normalize data_date from the row (may be date, datetime, or string)
        raw_anchor = report_row["data_date"]
        if isinstance(raw_anchor, str):
            anchor_data_date = date.fromisoformat(raw_anchor[:10])
        elif hasattr(raw_anchor, "date"):
            anchor_data_date = raw_anchor.date()
        else:
            anchor_data_date = raw_anchor
        client_name: str = report_row.get("client_name") or ""

        coverage_start, coverage_end = _derive_coverage_window(
            coverage_start=report_row.get("coverage_start_date"),
            coverage_end=report_row.get("coverage_end_date"),
            anchor_data_date=anchor_data_date,
        )
        covered_dates = _build_covered_date_list(coverage_start, coverage_end)

        report_response = ReportLiveStateResponse(
            report_id=report_id,
            report_name=report_row["report_name"],
            application_name=report_row.get("application_name") or "",
            data_date=anchor_data_date,
            delivery_date=report_row["delivery_date"],
            client_name=client_name,
            report_delivery_status=report_row.get("report_delivery_status") or "scheduled",
            report_delay_status=report_row.get("report_delay_status") or "unknown_state",
            report_delay_duration_minutes=report_row.get("report_delay_duration_minutes") or 0,
            total_no_of_steps=report_row.get("total_no_of_steps") or 0,
            no_of_completed_steps=report_row.get("no_of_completed_steps") or 0,
            no_of_running_steps=report_row.get("no_of_running_steps") or 0,
            no_of_delayed_steps=report_row.get("no_of_delayed_steps") or 0,
            bam_sla=report_row.get("bam_sla"),
            report_start_time=report_row.get("report_start_time"),
            report_end_time=report_row.get("report_end_time"),
            sev1_numbers=report_row.get("sev1_numbers"),
            sev1_urls=report_row.get("sev1_urls"),
            delayed_job_name=report_row.get("delayed_job_name"),
            report_metadata=report_row.get("report_metadata"),
            workflow_coordinates=report_row.get("workflow_coordinates"),
            coverage_start_date=coverage_start,
            coverage_end_date=coverage_end,
        )

        # Build job responses for this report
        job_mapping_rows = mappings_by_report_id.get(report_id, [])
        job_responses: list[ReportJobResponse] = []

        for mapping_row in job_mapping_rows:
            job_id: int = mapping_row["job_id"]
            definition_row = definitions_by_job_id.get(job_id)
            live_state_row = live_state_by_job_date.get((job_id, anchor_data_date))

            run_statuses = _build_run_statuses(
                job_id=job_id,
                covered_dates=covered_dates,
                window_rows_by_job_id=window_rows_by_job_id,
                client_name=client_name,
            )

            job_sev1_rows = sev1_rows_by_job_name.get(mapping_row["job_name"], [])

            job_response = _build_job_response(
                mapping_row=mapping_row,
                definition_row=definition_row,
                live_state_row=live_state_row,
                sev1_rows=job_sev1_rows,
                run_statuses=run_statuses,
                covered_dates=covered_dates,
                anchor_data_date=anchor_data_date,
            )
            job_responses.append(job_response)

        payloads.append(
            ReportHealthPayload(
                report=report_response,
                jobs=job_responses,
                coverage_start_date=coverage_start,
                coverage_end_date=coverage_end,
                covered_data_dates=covered_dates,
            )
        )

    return payloads


def _compute_union_window(report_rows: list[dict]) -> tuple[date, date]:
    """
    Find the earliest coverage_start and latest coverage_end across all
    reports in the result set to use as a single batch window query.
    """
    starts: list[date] = []
    ends: list[date] = []

    for row in report_rows:
        raw_anchor = row["data_date"]
        if isinstance(raw_anchor, str):
            anchor = date.fromisoformat(raw_anchor[:10])
        elif hasattr(raw_anchor, "date"):
            anchor = raw_anchor.date()
        else:
            anchor = raw_anchor
        raw_start = row.get("coverage_start_date")
        raw_end = row.get("coverage_end_date")
        start = _normalize_date(raw_start) if raw_start else anchor
        end = _normalize_date(raw_end) if raw_end else anchor
        starts.append(start)
        ends.append(end)

    overall_start = min(starts)
    overall_end = max(ends)

    # Safety cap
    if (overall_end - overall_start).days > MAX_COVERAGE_WINDOW_DAYS:
        overall_end = overall_start + timedelta(days=MAX_COVERAGE_WINDOW_DAYS)

    return overall_start, overall_end


def _build_payloads_without_jobs(report_rows: list[dict]) -> list[ReportHealthPayload]:
    """
    Fallback when reports have no job mappings yet.
    Returns report-level data only with empty jobs list.
    """
    payloads: list[ReportHealthPayload] = []
    for row in report_rows:
        anchor = row["data_date"]
        cov_start = row.get("coverage_start_date") or anchor
        cov_end = row.get("coverage_end_date") or anchor
        covered = _build_covered_date_list(cov_start, cov_end)

        payloads.append(
            ReportHealthPayload(
                report=ReportLiveStateResponse(
                    report_id=row["report_id"],
                    report_name=row["report_name"],
                    application_name=row.get("application_name") or "",
                    data_date=anchor,
                    delivery_date=row["delivery_date"],
                    client_name=row.get("client_name") or "",
                    report_delivery_status=row.get("report_delivery_status") or "scheduled",
                    report_delay_status=row.get("report_delay_status") or "unknown_state",
                    report_delay_duration_minutes=row.get("report_delay_duration_minutes") or 0,
                    total_no_of_steps=row.get("total_no_of_steps") or 0,
                    no_of_completed_steps=row.get("no_of_completed_steps") or 0,
                    no_of_running_steps=row.get("no_of_running_steps") or 0,
                    no_of_delayed_steps=row.get("no_of_delayed_steps") or 0,
                    bam_sla=row.get("bam_sla"),
                    report_start_time=row.get("report_start_time"),
                    report_end_time=row.get("report_end_time"),
                    sev1_numbers=row.get("sev1_numbers"),
                    sev1_urls=row.get("sev1_urls"),
                    delayed_job_name=row.get("delayed_job_name"),
                    coverage_start_date=cov_start,
                    coverage_end_date=cov_end,
                ),
                jobs=[],
                coverage_start_date=cov_start,
                coverage_end_date=cov_end,
                covered_data_dates=covered,
            )
        )
    return payloads
