"""
Job Onboarding — Admin-only API endpoints.

Handles the full lifecycle of onboarding a new job into NFC Prod:
  - List all jobs
  - View job details (definition + SLA + proxy rules + artifacts)
  - Onboard a new job (atomic)
  - Edit an existing job (diff-based, atomic)

Requires 'admin:job_onboarding' permission.

Job onboarding flow:
  1. Create job_definitions entry (name, owner, category, oncall, etc.)
  2. Create SLA policies — OR if proxy, inherit from trigger job
  3. Create proxy inference rules (if proxy)
  4. Create artifact definitions (optional)
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.routers.auth import limiter
from app.services.audit_chain import seal_and_persist
from app.services.connection_status import mark_connection_active, mark_connection_failed
from app.services.db_connector import get_connector
from app.services.job_onboarding import (
    EditJobRequest,
    JobOnboardRequest,
    build_job_edit_statements,
    build_job_onboarding_statements,
    check_job_duplicates,
    fetch_job_details,
    fetch_job_sla_policies,
    fetch_next_job_id,
)
from app.services.metrics import refresh_metrics_view
from app.services.onboarding.connection import find_nfc_connection
from app.services.query_metrics import track_transaction
from app.services.rbac import require_permission
from app.services.sla_conversion import convert_report_sla_to_job_sla

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/job-onboarding", tags=["admin"])


# ═══════════════════════════════════════════════════════════════════════════════
# Read Endpoints — List & View Jobs
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/jobs")
@limiter.limit("30/minute")
def list_jobs_endpoint(
    request: Request,
    user: User = Depends(require_permission("admin:job_onboarding")),
    db: Session = Depends(get_db),
):
    """List all job definitions (lightweight — just id + name for search)."""
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        results = connector.execute_query(
            """
            SELECT job_id, job_name
            FROM public.job_definitions
            WHERE is_deleted = false OR is_deleted IS NULL
            ORDER BY job_name
            """,
            {},
        )
    except Exception as e:
        logger.error(f"Failed to fetch job definitions: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch job definitions") from e

    mark_connection_active(conn, db)
    jobs = [dict(r) for r in results] if results else []
    return {"jobs": jobs, "total": len(jobs)}


@router.get("/jobs/{job_id}")
@limiter.limit("30/minute")
def get_job_details_endpoint(
    job_id: int,
    request: Request,
    user: User = Depends(require_permission("admin:job_onboarding")),
    db: Session = Depends(get_db),
):
    """
    Fetch full job configuration:
      - job_definitions fields
      - sla_policies for this job
      - proxy inference rules (if proxy)
      - artifact definitions
    """
    if job_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid job_id")

    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        details = fetch_job_details(connector, job_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch job {job_id}: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch job details") from e

    mark_connection_active(conn, db)
    return details


@router.get("/next-id")
@limiter.limit("30/minute")
def get_next_job_id_endpoint(
    request: Request,
    user: User = Depends(require_permission("admin:job_onboarding")),
    db: Session = Depends(get_db),
):
    """Fetch the next available job_id for preview."""
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        next_id = fetch_next_job_id(connector)
    except Exception as e:
        logger.error(f"Failed to fetch next job ID: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch next job ID") from e

    mark_connection_active(conn, db)
    return {"next_job_id": next_id}


@router.get("/trigger-jobs")
@limiter.limit("30/minute")
def list_trigger_jobs_endpoint(
    request: Request,
    user: User = Depends(require_permission("admin:job_onboarding")),
    db: Session = Depends(get_db),
):
    """
    List existing jobs that can be used as trigger jobs for proxy rules.
    Returns job_id + job_name for selection in the UI.
    """
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        results = connector.execute_query(
            """
            SELECT job_id, job_name
            FROM public.job_definitions
            WHERE (is_deleted = false OR is_deleted IS NULL)
            ORDER BY job_name
            """,
            {},
        )
    except Exception as e:
        logger.error(f"Failed to fetch trigger jobs: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch trigger jobs") from e

    mark_connection_active(conn, db)
    jobs = [dict(r) for r in results] if results else []
    return {"jobs": jobs, "total": len(jobs)}


@router.get("/trigger-jobs/{job_id}/sla")
@limiter.limit("30/minute")
def get_trigger_job_sla_endpoint(
    job_id: int,
    request: Request,
    user: User = Depends(require_permission("admin:job_onboarding")),
    db: Session = Depends(get_db),
):
    """
    Fetch SLA policies for a trigger job.
    Used to show what SLA the proxy will inherit.
    """
    if job_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid job_id")

    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        # Get job name first
        job = connector.execute_query(
            "SELECT job_name FROM public.job_definitions WHERE job_id = :jid",
            {"jid": job_id},
        )
        if not job:
            raise HTTPException(status_code=404, detail=f"Trigger job {job_id} not found")

        sla_policies = fetch_job_sla_policies(connector, job[0]["job_name"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch trigger job SLA: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch trigger job SLA") from e

    mark_connection_active(conn, db)
    return {
        "job_id": job_id,
        "job_name": job[0]["job_name"],
        "sla_policies": sla_policies,
    }


@router.get("/report-sla-options")
@limiter.limit("30/minute")
def list_report_sla_options_endpoint(
    request: Request,
    user: User = Depends(require_permission("admin:job_onboarding")),
    db: Session = Depends(get_db),
):
    """List distinct report_name + application_name from report_sla_policies for dropdown."""
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        results = connector.execute_query(
            """
            SELECT DISTINCT report_name, application_name, report_id
            FROM public.report_sla_policies
            ORDER BY report_name, application_name
            """,
            {},
        )
    except Exception as e:
        logger.error(f"Failed to fetch report SLA options: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch report SLA options") from e

    mark_connection_active(conn, db)
    reports = [dict(r) for r in results] if results else []
    return {"reports": reports}


@router.get("/report-sla/{report_id}/convert")
@limiter.limit("30/minute")
def convert_report_sla_to_job_endpoint(
    report_id: int,
    request: Request,
    include_weekends: bool = False,
    user: User = Depends(require_permission("admin:job_onboarding")),
    db: Session = Depends(get_db),
):
    """
    Fetch a report's SLA policies and convert them into job SLA format.

    Conversion logic:
    - expected_sla_time, expected_time, timezone → copied from report
    - schedule_frequency → copied from report (daily or weekly)
    - expected_start_time → 1 hour before SLA time
    - expected_duration_minutes → 60 (default, editable by user)
    - days_addition_sla = abs(data_date_formula) per policy
    - days_addition_start_time = same as days_addition_sla
    - data_date_formula → null (job doesn't need it)
    - day_of_week → if report is 'daily' with 7 distinct days, generate Mon-Sun;
                     if report is 'weekly' with specific days, use those days
    """
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        results = connector.execute_query(
            """
            SELECT day_of_week, schedule_frequency, expected_start_time,
                   expected_sla_time, expected_time, timezone,
                   days_addition_start_time, days_addition_sla,
                   data_date_formula, report_name, application_name
            FROM public.report_sla_policies
            WHERE report_id = :rid
            ORDER BY day_of_week
            """,
            {"rid": report_id},
        )
    except Exception as e:
        logger.error(f"Failed to fetch report SLA for conversion: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch report SLA") from e

    mark_connection_active(conn, db)

    if not results:
        raise HTTPException(status_code=404, detail="No SLA policies found for this report")

    policies = [dict(r) for r in results]
    report_name = policies[0].get("report_name", "")
    application_name = policies[0].get("application_name", "")

    # Use the SLA conversion service
    job_policies = convert_report_sla_to_job_sla(policies, include_weekends=include_weekends)

    return {
        "report_name": report_name,
        "application_name": application_name,
        "schedule_frequency": "daily",
        "job_sla_policies": job_policies,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Onboard New Job — Execute
# ═══════════════════════════════════════════════════════════════════════════════


@router.post("/execute")
@limiter.limit("5/minute")
def execute_job_onboarding_endpoint(
    request: Request,
    payload: JobOnboardRequest,
    user: User = Depends(require_permission("admin:job_onboarding")),
    db: Session = Depends(get_db),
):
    """
    Execute the complete job onboarding in a single transaction.
    All inserts happen atomically — if any fail, everything rolls back.

    If is_proxy=True:
      - SLA policies are NOT created (inherited from trigger job at runtime)
      - proxy_rules MUST be provided to link to the trigger job(s)
    """
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        # Resolve next job_id at execution time
        next_job_id = fetch_next_job_id(connector)

        # Duplicate check
        check_job_duplicates(connector, job_name=payload.job_name)

        # Validate proxy configuration
        if payload.is_proxy and not payload.proxy_rules:
            raise HTTPException(
                status_code=400,
                detail="Proxy jobs must have at least one proxy rule linking to a trigger job.",
            )

        if not payload.sla_policies:
            raise HTTPException(
                status_code=400,
                detail="At least one SLA policy is required.",
            )

        # Build atomic statement list
        statements = build_job_onboarding_statements(
            job_id=next_job_id,
            payload=payload,
        )

        # Execute all atomically
        result, metrics = track_transaction(connector, statements)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job onboarding failed: {e}")
        mark_connection_failed(conn, db)

        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            connection_id=conn.id,
            connection_name=conn.name,
            operation="ONBOARD_JOB",
            table_name="job_definitions",
            row_count=0,
            query_preview=f"FAILED: job_name={payload.job_name}",
            status="failed",
            error_message=str(e)[:500],
        )
        seal_and_persist(audit, db)
        refresh_metrics_view(db)
        raise HTTPException(
            status_code=500,
            detail=f"Job onboarding failed: {str(e)[:200]}",
        ) from e

    mark_connection_active(conn, db)

    # Audit log
    tables_touched = "job_definitions"
    if payload.sla_policies:
        tables_touched += ",sla_policies"
    if payload.proxy_rules:
        tables_touched += ",job_proxy_inference_rules"
    if payload.artifact_definitions:
        tables_touched += ",artifact_definitions"

    query_preview = (
        f"ONBOARD_JOB job_id={next_job_id} "
        f"job_name={payload.job_name} "
        f"is_proxy={payload.is_proxy} "
        f"sla_count={len(payload.sla_policies)} "
        f"proxy_rules={len(payload.proxy_rules)} "
        f"artifacts={len(payload.artifact_definitions)} "
        f"executed={result['executed']} skipped={result['skipped']}"
    )

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        connection_id=conn.id,
        connection_name=conn.name,
        operation="ONBOARD_JOB",
        table_name=tables_touched,
        row_count=len(statements),
        rows_inserted=result["executed"],
        rows_skipped=result["skipped"],
        query_preview=query_preview[:500],
        status="success",
        total_time_ms=metrics.total_time_ms,
        peak_memory_bytes=metrics.peak_memory_bytes,
        cpu_time_s=metrics.cpu_time_s,
    )
    seal_and_persist(audit, db)
    refresh_metrics_view(db)

    return {
        "success": True,
        "job_id": next_job_id,
        "job_name": payload.job_name,
        "is_proxy": payload.is_proxy,
        "sla_policies_created": 0 if payload.is_proxy else len(payload.sla_policies),
        "proxy_rules_created": len(payload.proxy_rules),
        "artifacts_created": len(payload.artifact_definitions),
        "total_statements": len(statements),
        "executed": result["executed"],
        "skipped": result["skipped"],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Edit Existing Job
# ═══════════════════════════════════════════════════════════════════════════════


@router.put("/update")
@limiter.limit("5/minute")
def update_job_endpoint(
    request: Request,
    payload: EditJobRequest,
    user: User = Depends(require_permission("admin:job_onboarding")),
    db: Session = Depends(get_db),
):
    """
    Execute diff-based edits on an existing job.
    Supports partial updates: only provided fields are changed.
    SLA policies, proxy rules, and artifact definitions use full-replacement strategy.
    """
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        # Verify job exists
        job = connector.execute_query(
            "SELECT job_id, job_name FROM public.job_definitions WHERE job_id = :jid",
            {"jid": payload.job_id},
        )
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {payload.job_id} not found")

        job_name = job[0]["job_name"]

        # Build diff-based statements
        edit_result = build_job_edit_statements(
            connector=connector,
            job_id=payload.job_id,
            job_name=job_name,
            payload=payload,
        )

        statements = edit_result["statements"]
        diff = edit_result["diff"]

        if not statements:
            return {
                "success": True,
                "job_id": payload.job_id,
                "job_name": job_name,
                "message": "No changes detected",
                "total_statements": 0,
                "executed": 0,
                "skipped": 0,
                "diff": diff,
            }

        # Execute atomically
        result, metrics = track_transaction(connector, statements)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job edit failed for job_id={payload.job_id}: {e}")
        mark_connection_failed(conn, db)

        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            connection_id=conn.id,
            connection_name=conn.name,
            operation="EDIT_JOB",
            table_name="job_definitions",
            row_count=0,
            query_preview=f"FAILED EDIT: job_id={payload.job_id}",
            status="failed",
            error_message=str(e)[:500],
        )
        seal_and_persist(audit, db)
        refresh_metrics_view(db)
        raise HTTPException(
            status_code=500,
            detail=f"Job edit failed: {str(e)[:200]}",
        ) from e

    mark_connection_active(conn, db)

    # Audit
    changes = [k for k, v in diff.items() if v]
    query_preview = f"EDIT_JOB job_id={payload.job_id} job_name={job_name} | " + ", ".join(changes)

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        connection_id=conn.id,
        connection_name=conn.name,
        operation="EDIT_JOB",
        table_name="job_definitions,sla_policies,job_proxy_inference_rules,artifact_definitions",
        row_count=len(statements),
        rows_inserted=result["executed"],
        rows_skipped=result["skipped"],
        query_preview=query_preview[:500],
        status="success",
        total_time_ms=metrics.total_time_ms,
        peak_memory_bytes=metrics.peak_memory_bytes,
        cpu_time_s=metrics.cpu_time_s,
    )
    seal_and_persist(audit, db)
    refresh_metrics_view(db)

    return {
        "success": True,
        "job_id": payload.job_id,
        "job_name": job_name,
        "total_statements": len(statements),
        "executed": result["executed"],
        "skipped": result["skipped"],
        "diff": diff,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Soft Delete (mark as deleted)
# ═══════════════════════════════════════════════════════════════════════════════


@router.delete("/jobs/{job_id}")
@limiter.limit("5/minute")
def soft_delete_job_endpoint(
    job_id: int,
    request: Request,
    user: User = Depends(require_permission("admin:job_onboarding")),
    db: Session = Depends(get_db),
):
    """Soft-delete a job (set is_deleted=true). Does not remove SLA/proxy/artifact data."""
    if job_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid job_id")

    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        # Verify exists
        job = connector.execute_query(
            "SELECT job_name FROM public.job_definitions WHERE job_id = :jid",
            {"jid": job_id},
        )
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

        statements = [
            {
                "sql": """
                UPDATE public.job_definitions
                SET is_deleted = true, updated_at = now()
                WHERE job_id = :jid
            """,
                "params": {"jid": job_id},
            }
        ]

        result, metrics = track_transaction(connector, statements)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job delete failed for job_id={job_id}: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)[:200]}") from e

    mark_connection_active(conn, db)

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        connection_id=conn.id,
        connection_name=conn.name,
        operation="DELETE_JOB",
        table_name="job_definitions",
        row_count=1,
        rows_inserted=result["executed"],
        query_preview=f"DELETE_JOB job_id={job_id} job_name={job[0]['job_name']}",
        status="success",
        total_time_ms=metrics.total_time_ms,
        peak_memory_bytes=metrics.peak_memory_bytes,
        cpu_time_s=metrics.cpu_time_s,
    )
    seal_and_persist(audit, db)

    return {
        "success": True,
        "job_id": job_id,
        "job_name": job[0]["job_name"],
        "message": "Job marked as deleted",
    }
