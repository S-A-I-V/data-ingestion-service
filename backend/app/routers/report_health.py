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
from app.services.report_health.schema import ReportHealthPayload

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

REQUIRED_PERMISSION = "admin:report_health"
RATE_LIMIT_PER_MINUTE = "30/minute"

# ── Router ─────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/admin/report-health", tags=["admin"])


@router.get("/", response_model=list[ReportHealthPayload])
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_report_health(
    request: Request,
    delivery_date: date = Query(
        default=None,
        description=(
            "The delivery date start (YYYY-MM-DD). "
            "Filters report_live_state.delivery_date. "
            "Defaults to today if omitted."
        ),
    ),
    delivery_date_to: date = Query(
        default=None,
        description=(
            "The delivery date end (YYYY-MM-DD) for range queries. "
            "If omitted, defaults to delivery_date (single-day query)."
        ),
    ),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> list[ReportHealthPayload]:
    """
    Return pipeline health for all reports scheduled for delivery on `delivery_date`
    (or between `delivery_date` and `delivery_date_to` if both are provided).

    Each item in the response includes:
      - Report-level delivery state + SLA + delay attribution
      - All constituent jobs with runtime status, per-date heatmap, ownership
      - Coverage window (data_date range for multi-day reports like L+7)
    """
    # Default to today if not provided (FastAPI doesn't support dynamic defaults)
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

    logger.info(
        "report_health_fetched",
        extra={
            "user": user.email,
            "delivery_date": str(resolved_date),
            "report_count": len(payloads),
        },
    )

    return payloads


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
