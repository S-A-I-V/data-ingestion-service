"""
Client Onboarding — Admin-only API endpoints.

Thin router layer that delegates to the onboarding service modules:
  - services/onboarding/schemas.py    → request validation
  - services/onboarding/connection.py → NFC Prod DB resolution
  - services/onboarding/queries.py    → SQL builders & data fetchers

Requires 'admin:client_onboarding' permission.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.routers.auth import limiter
from app.services.connection_status import mark_connection_active, mark_connection_failed
from app.services.db_connector import get_connector
from app.services.onboarding import (
    OnboardRequest,
    build_onboarding_statements,
    check_duplicates,
    fetch_next_ids,
    fetch_report_definitions,
    fetch_report_map,
    find_nfc_connection,
)
from app.services.rbac import require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/client-onboarding", tags=["admin"])


@router.get("/report-definitions")
@limiter.limit("30/minute")
def get_report_definitions_endpoint(
    request: Request,
    user: User = Depends(require_permission("admin:client_onboarding")),
    db: Session = Depends(get_db),
):
    """Fetch available report definitions from report_definitions table."""
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        reports = fetch_report_definitions(connector)
    except Exception as e:
        logger.error(f"Failed to fetch report definitions: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch report definitions") from e

    mark_connection_active(conn, db)
    return {"reports": reports, "total": len(reports)}


@router.get("/next-ids")
@limiter.limit("30/minute")
def get_next_ids_endpoint(
    request: Request,
    user: User = Depends(require_permission("admin:client_onboarding")),
    db: Session = Depends(get_db),
):
    """Fetch the next available client_id, group_id for preview."""
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        ids = fetch_next_ids(connector)
    except Exception as e:
        logger.error(f"Failed to fetch next IDs: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch next available IDs") from e

    mark_connection_active(conn, db)
    return ids


@router.post("/execute")
@limiter.limit("5/minute")
def execute_onboarding_endpoint(
    request: Request,
    payload: OnboardRequest,
    user: User = Depends(require_permission("admin:client_onboarding")),
    db: Session = Depends(get_db),
):
    """
    Execute the complete client onboarding in a single transaction.
    All inserts happen atomically — if any fail, everything rolls back.
    """
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        # Resolve next IDs at execution time
        ids = fetch_next_ids(connector)
        next_client_id = ids["next_client_id"]
        next_group_id = ids["next_group_id"]

        # Duplicate check — prevent collisions if DB changed since preview
        check_duplicates(
            connector,
            client_id=next_client_id,
            client_name=payload.client_name,
            group_id=next_group_id,
            group_name=payload.group_name,
        )

        # Fetch report metadata for selected IDs
        report_map = fetch_report_map(connector, payload.report_ids)

        # Build atomic statement list
        statements = build_onboarding_statements(
            client_id=next_client_id,
            client_name=payload.client_name,
            group_id=next_group_id,
            group_name=payload.group_name,
            beid_org_mappings=payload.beid_org_mappings,
            report_ids=payload.report_ids,
            report_map=report_map,
        )

        # Execute all — skip duplicate conflicts (e.g. existing BEID mappings)
        result = connector.execute_transaction_skip_conflicts(statements)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Client onboarding failed: {e}")
        mark_connection_failed(conn, db)
        # Audit the failure
        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            connection_id=conn.id,
            connection_name=conn.name,
            operation="ONBOARD",
            table_name="client_details",
            row_count=0,
            query_preview=f"FAILED: client_name={payload.client_name}",
            status="failed",
            error_message=str(e)[:500],
        )
        last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
        audit.seal(last.record_hash if last else None)
        db.add(audit)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Onboarding transaction failed: {str(e)}",
        ) from e

    mark_connection_active(conn, db)

    # Record in audit log
    total_rows = result["executed"]
    skipped_rows = result["skipped"]
    query_preview = (
        f"ONBOARD client_id={next_client_id} "
        f"client_name={payload.client_name} "
        f"group_id={next_group_id} "
        f"beids={len(payload.beid_org_mappings)} "
        f"reports={len(payload.report_ids)} "
        f"executed={total_rows} skipped={skipped_rows}"
    )
    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        connection_id=conn.id,
        connection_name=conn.name,
        operation="ONBOARD",
        table_name="client_details,groups,client_groups,beid_mapping,report_mapping",
        row_count=len(statements),
        rows_inserted=total_rows,
        rows_skipped=skipped_rows,
        query_preview=query_preview,
        status="success",
    )
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    audit.seal(last.record_hash if last else None)
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "client_id": next_client_id,
        "group_id": next_group_id,
        "client_name": payload.client_name,
        "group_name": payload.group_name,
        "beids_mapped": len(payload.beid_org_mappings),
        "reports_mapped": len(payload.report_ids),
        "total_statements": len(statements),
        "executed": total_rows,
        "skipped": skipped_rows,
    }
