"""
Report Health Dashboard — Admin-only endpoint.

Returns full pipeline health data for every report scheduled for delivery
on a given date. Requires the 'admin:report_health' permission.

Data sources (all from nfc_prod):
  • report_live_state          → report-level delivery & delay status
  • report_job_mapping         → report → job DAG wiring
  • job_definitions            → static job metadata + ownership
  • job_live_state             → per-(job, data_date) runtime status
  • sev1_incidents             → active severity-1 incidents per job
  • sla_policies               → job-level SLA thresholds

The router is intentionally thin: all data logic lives in the
services/report_health/ package. The router is responsible only for:
  - HTTP method + path + rate limit
  - Input validation (delivery_date format)
  - RBAC enforcement via require_permission
  - NFC Prod connection resolution + error mapping
  - Audit (connection health marking)
"""

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import limiter
from app.services.connection_status import mark_connection_active, mark_connection_failed
from app.services.rbac import require_permission
from app.services.report_health.assembler import assemble_report_health_payloads
from app.services.report_health.nfc_connection import resolve_nfc_prod_connection_with_record
from app.services.report_health.schema import ReportHealthListResponse, ReportHealthPayload, ReportHealthSummary

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

REQUIRED_PERMISSION = "admin:report_health"
RATE_LIMIT_PER_MINUTE = "30/minute"

# ── Router ─────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/admin/report-health", tags=["admin"])


@router.get("/", response_model=ReportHealthListResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_report_health(
    request: Request,
    delivery_date: date = Query(
        default=None,
        description="Delivery date start (YYYY-MM-DD). Defaults to today.",
    ),
    delivery_date_to: date = Query(
        default=None,
        description="Delivery date end (YYYY-MM-DD). Defaults to delivery_date.",
    ),
    report_name: str = Query(
        default=None,
        description="Filter by report name (substring match, case-insensitive).",
    ),
    client_name: str = Query(
        default=None,
        description="Filter by client name (substring match, case-insensitive).",
    ),
    application_name: str = Query(
        default=None,
        description="Filter by application name (exact match).",
    ),
    delay_status: str = Query(
        default=None,
        description="Filter by delay status: client_delayed, internal_delayed, on_track.",
    ),
    sev1: str = Query(
        default=None,
        description="Filter by SEV1 number (substring match).",
    ),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> ReportHealthListResponse:
    """
    Return pipeline health for reports matching the given filters.

    All filtering, counting, and sorting is done server-side.
    The frontend should just display what this returns.
    """
    resolved_date: date = delivery_date or date.today()
    resolved_date_to: date | None = delivery_date_to

    # Resolve saved NFC Prod connection for this user
    try:
        nfc_connector, nfc_connection_record = resolve_nfc_prod_connection_with_record(
            user_id=user.id,
            db=db,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to resolve NFC Prod connection for user %s: %s", user.email, exc)
        raise HTTPException(
            status_code=503,
            detail="Could not establish connection to NFC Prod. Check your saved connections.",
        ) from exc

    # Execute all queries and assemble the payload
    try:
        payloads = assemble_report_health_payloads(
            connector=nfc_connector,
            delivery_date=resolved_date,
            delivery_date_to=resolved_date_to,
        )
    except HTTPException:
        mark_connection_failed(nfc_connection_record, db)
        raise
    except Exception as exc:
        logger.error(
            "Unexpected error assembling report health for date %s, user %s: %s",
            resolved_date,
            user.email,
            exc,
        )
        mark_connection_failed(nfc_connection_record, db)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while fetching report health data.",
        ) from exc

    mark_connection_active(nfc_connection_record, db)

    # ── Server-side filtering ─────────────────────────────────────────────────
    filtered = payloads
    if report_name:
        q = report_name.lower()
        filtered = [p for p in filtered if q in p.report.report_name.lower()]
    if client_name:
        q = client_name.lower()
        filtered = [p for p in filtered if q in (p.report.client_name or "").lower()]
    if application_name:
        filtered = [p for p in filtered if p.report.application_name == application_name]
    if sev1:
        q = sev1.lower()
        filtered = [p for p in filtered if q in (p.report.sev1_numbers or "").lower()]
    if delay_status:
        filtered = [p for p in filtered if p.report.report_delay_status == delay_status]

    # ── Compute summary counts ────────────────────────────────────────────────
    # Counts are computed BEFORE delay_status filter so the strip shows totals
    # for the base filter set (report_name, client, app, sev1, date range).
    base = payloads
    if report_name:
        q = report_name.lower()
        base = [p for p in base if q in p.report.report_name.lower()]
    if client_name:
        q = client_name.lower()
        base = [p for p in base if q in (p.report.client_name or "").lower()]
    if application_name:
        base = [p for p in base if p.report.application_name == application_name]
    if sev1:
        q = sev1.lower()
        base = [p for p in base if q in (p.report.sev1_numbers or "").lower()]

    summary = ReportHealthSummary(
        total=len(base),
        in_progress=sum(1 for p in base if p.report.report_delivery_status == "in_progress"),
        client_delayed=sum(1 for p in base if p.report.report_delay_status == "client_delayed"),
        internal_delayed=sum(1 for p in base if p.report.report_delay_status == "internal_delayed"),
        completed=sum(1 for p in base if p.report.report_delivery_status == "success"),
    )

    logger.info(
        "report_health_fetched",
        extra={
            "user": user.email,
            "delivery_date": str(resolved_date),
            "report_count": len(filtered),
        },
    )

    return ReportHealthListResponse(reports=filtered, summary=summary)


@router.get("/filters", response_model=dict)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_report_health_filters(
    request: Request,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> dict:
    """
    Return available filter options (report names, application names) for the
    Report Health Dashboard combobox dropdowns.

    Queries report_definitions for all active report/app combos.
    """
    from app.services.report_health.assembler import fetch_filter_options

    try:
        nfc_connector, nfc_connection_record = resolve_nfc_prod_connection_with_record(
            user_id=user.id,
            db=db,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to resolve NFC Prod connection for filters: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Could not establish connection to NFC Prod.",
        ) from exc

    try:
        options = fetch_filter_options(connector=nfc_connector)
    except Exception as exc:
        logger.warning("Failed to fetch filter options: %s", exc)
        mark_connection_failed(nfc_connection_record, db)
        return {"report_names": [], "application_names": []}

    mark_connection_active(nfc_connection_record, db)
    return options


@router.get("/{report_id}/detail", response_model=ReportHealthPayload)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_report_health_detail(
    request: Request,
    report_id: int,
    data_date: date = Query(
        ...,
        description="The data_date for this report entry (from the list response).",
    ),
    delivery_date: date = Query(
        ...,
        description="The delivery_date for this report entry.",
    ),
    client_name: str = Query(
        default="",
        description="Client name scope (blank for non-client-scoped reports).",
    ),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> ReportHealthPayload:
    """
    Return full job-level detail for a single report entry.

    Called on-demand when a user clicks a report row in the dashboard.
    Fetches fresh job_live_state data so run counts are always current.
    """
    from app.services.report_health.assembler import assemble_single_report_detail

    try:
        nfc_connector, nfc_connection_record = resolve_nfc_prod_connection_with_record(
            user_id=user.id,
            db=db,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to resolve NFC Prod connection for user %s: %s", user.email, exc)
        raise HTTPException(
            status_code=503,
            detail="Could not establish connection to NFC Prod. Check your saved connections.",
        ) from exc

    try:
        payload = assemble_single_report_detail(
            connector=nfc_connector,
            report_id=report_id,
            data_date=data_date,
            delivery_date=delivery_date,
            client_name=client_name,
        )
    except HTTPException:
        mark_connection_failed(nfc_connection_record, db)
        raise
    except Exception as exc:
        logger.error(
            "Unexpected error assembling report detail for report_id=%s, date=%s: %s",
            report_id,
            data_date,
            exc,
        )
        mark_connection_failed(nfc_connection_record, db)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while fetching report detail.",
        ) from exc

    mark_connection_active(nfc_connection_record, db)
    return payload
