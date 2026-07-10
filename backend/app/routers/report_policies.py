"""
Report Policies — Admin-only CRUD for report_definitions + report_sla_policies.

Flow:
  1. GET  /reports        → list all report_definitions (id, name, app, is_fastie)
  2. GET  /{report_id}   → get report details + all SLA policies for that report
  3. POST /preview       → generate SQL diff for proposed changes
  4. POST /apply         → execute changes atomically on NFC Prod

Tables affected:
  • report_definitions   → report_name, application_name, is_fastie, is_deleted
  • report_sla_policies  → day_of_week, schedule_frequency, expected_start_time,
                           expected_sla_time, expected_time, timezone,
                           days_addition_start_time, days_addition_sla,
                           data_date_formula, window_mode, window_start_offset_days,
                           window_end_offset_days, anchor_type
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import limiter
from app.services.connection_status import mark_connection_active, mark_connection_failed
from app.services.rbac import require_permission
from app.services.report_health.nfc_connection import resolve_nfc_prod_connection_with_record

logger = logging.getLogger(__name__)

REQUIRED_PERMISSION = "admin:report_policies"
RATE_LIMIT = "30/minute"

router = APIRouter(prefix="/api/admin/report-policies", tags=["admin"])


# ── Schemas ───────────────────────────────────────────────────────────────────


class PolicyUpdate(BaseModel):
    policy_id: str
    day_of_week: Optional[str] = None
    schedule_frequency: Optional[str] = None
    expected_start_time: Optional[str] = None
    expected_sla_time: Optional[str] = None
    expected_time: Optional[str] = None
    timezone: Optional[str] = None
    days_addition_start_time: Optional[int] = None
    days_addition_sla: Optional[int] = None
    data_date_formula: Optional[int] = None
    window_mode: Optional[str] = None
    window_start_offset_days: Optional[int] = None
    window_end_offset_days: Optional[int] = None
    anchor_type: Optional[str] = None


class ReportUpdate(BaseModel):
    report_name: Optional[str] = None
    application_name: Optional[str] = None
    is_fastie: Optional[bool] = None


class ApplyRequest(BaseModel):
    report_id: int
    report_changes: Optional[ReportUpdate] = None
    policy_changes: list[PolicyUpdate] = []


# ── Queries ───────────────────────────────────────────────────────────────────

LIST_REPORTS_SQL = """
SELECT report_id, report_name, application_name, is_fastie, is_deleted, created_at, updated_at
FROM report_definitions
WHERE is_deleted = false
ORDER BY report_name, application_name
"""

GET_REPORT_SQL = """
SELECT report_id, report_name, application_name, is_fastie, is_deleted, created_at, updated_at
FROM report_definitions
WHERE report_id = :report_id
"""

GET_POLICIES_SQL = """
SELECT policy_id, report_id, report_name, application_name,
       day_of_week, schedule_frequency,
       expected_start_time, expected_sla_time, expected_time,
       timezone, days_addition_start_time, days_addition_sla,
       data_date_formula, window_mode, window_start_offset_days,
       window_end_offset_days, anchor_type, created_at
FROM report_sla_policies
WHERE report_id = :report_id
ORDER BY day_of_week, schedule_frequency
"""


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/reports")
@limiter.limit(RATE_LIMIT)
def list_reports(
    request: Request,
    search: str = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
):
    """List all report definitions (non-deleted)."""
    connector, conn_record = resolve_nfc_prod_connection_with_record(user.id, db)
    try:
        rows = connector.execute_query(LIST_REPORTS_SQL, {})
        mark_connection_active(conn_record, db)
    except Exception as e:
        mark_connection_failed(conn_record, db)
        raise HTTPException(status_code=503, detail=f"NFC Prod query failed: {e}") from e

    reports = [dict(r) for r in rows]

    if search:
        s = search.lower()
        reports = [
            r
            for r in reports
            if s in (r.get("report_name") or "").lower() or s in (r.get("application_name") or "").lower()
        ]

    return {"reports": reports, "total": len(reports)}


@router.get("/reports/{report_id}")
@limiter.limit(RATE_LIMIT)
def get_report_with_policies(
    request: Request,
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
):
    """Get a single report's details + all its SLA policies."""
    connector, conn_record = resolve_nfc_prod_connection_with_record(user.id, db)
    try:
        report_rows = connector.execute_query(GET_REPORT_SQL, {"report_id": report_id})
        policy_rows = connector.execute_query(GET_POLICIES_SQL, {"report_id": report_id})
        mark_connection_active(conn_record, db)
    except Exception as e:
        mark_connection_failed(conn_record, db)
        raise HTTPException(status_code=503, detail=f"NFC Prod query failed: {e}") from e

    if not report_rows:
        raise HTTPException(status_code=404, detail=f"Report #{report_id} not found")

    report = dict(report_rows[0])
    policies = [dict(r) for r in policy_rows]

    # Convert time objects to strings for JSON serialization
    for p in policies:
        for field in ("expected_start_time", "expected_sla_time", "expected_time"):
            if p.get(field) is not None:
                p[field] = str(p[field])
        if p.get("policy_id"):
            p["policy_id"] = str(p["policy_id"])

    return {"report": report, "policies": policies}


@router.post("/preview")
@limiter.limit(RATE_LIMIT)
def preview_changes(
    request: Request,
    body: ApplyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
):
    """Generate SQL statements for proposed changes (dry run)."""
    statements = []

    # Report definition changes
    if body.report_changes:
        updates = body.report_changes.model_dump(exclude_none=True)
        if updates:
            set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
            sql = f"UPDATE report_definitions SET {set_clauses}, updated_at = now() WHERE report_id = :report_id"  # noqa: S608
            params = {**updates, "report_id": body.report_id}
            statements.append({"sql": sql, "params": params})

    # Policy changes
    for pc in body.policy_changes:
        updates = pc.model_dump(exclude_none=True, exclude={"policy_id"})
        if updates:
            set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
            sql = f"UPDATE report_sla_policies SET {set_clauses} WHERE policy_id = :policy_id"  # noqa: S608
            params = {**updates, "policy_id": pc.policy_id}
            statements.append({"sql": sql, "params": params})

    return {"statements": statements, "total": len(statements)}


@router.post("/apply")
@limiter.limit("10/minute")
def apply_changes(
    request: Request,
    body: ApplyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
):
    """Execute proposed changes on NFC Prod in a single transaction."""
    connector, conn_record = resolve_nfc_prod_connection_with_record(user.id, db)

    statements = []

    # Build report definition update
    if body.report_changes:
        updates = body.report_changes.model_dump(exclude_none=True)
        if updates:
            set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
            sql = f"UPDATE report_definitions SET {set_clauses}, updated_at = now() WHERE report_id = :report_id"  # noqa: S608
            params = {**updates, "report_id": body.report_id}
            statements.append((sql, params))

    # Build policy updates
    for pc in body.policy_changes:
        updates = pc.model_dump(exclude_none=True, exclude={"policy_id"})
        if updates:
            set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
            sql = f"UPDATE report_sla_policies SET {set_clauses} WHERE policy_id = :policy_id"  # noqa: S608
            params = {**updates, "policy_id": pc.policy_id}
            statements.append((sql, params))

    if not statements:
        return {"executed": 0, "total_statements": 0, "message": "No changes to apply"}

    try:
        connector.execute_transaction(statements)
        mark_connection_active(conn_record, db)
    except Exception as e:
        mark_connection_failed(conn_record, db)
        raise HTTPException(status_code=500, detail=f"Transaction failed: {e}") from e

    logger.info(
        "Report policy update applied | report_id=%s | statements=%d | user=%s",
        body.report_id,
        len(statements),
        user.email,
    )

    return {
        "executed": len(statements),
        "total_statements": len(statements),
        "report_id": body.report_id,
    }
