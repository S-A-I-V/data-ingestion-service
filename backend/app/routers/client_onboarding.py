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
    EditClientRequest,
    OnboardRequest,
    build_edit_statements,
    build_onboarding_statements,
    check_duplicates,
    fetch_all_clients,
    fetch_client_details,
    fetch_next_ids,
    fetch_report_definitions,
    fetch_report_map,
    find_nfc_connection,
)
from app.services.query_metrics import track_transaction
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
            fastie_aliases=payload.fastie_aliases,
        )

        # Execute all — skip duplicate conflicts, capture metrics
        result, metrics = track_transaction(connector, statements)

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
        total_time_ms=metrics.total_time_ms,
        peak_memory_bytes=metrics.peak_memory_bytes,
        cpu_time_s=metrics.cpu_time_s,
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


# ═══════════════════════════════════════════════════════════════════════════════
# Edit Existing Client — Endpoints
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/clients")
@limiter.limit("30/minute")
def list_clients_endpoint(
    request: Request,
    user: User = Depends(require_permission("admin:client_onboarding")),
    db: Session = Depends(get_db),
):
    """List all clients for the search/select dropdown."""
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        clients = fetch_all_clients(connector)
    except Exception as e:
        logger.error(f"Failed to fetch clients: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch client list") from e

    mark_connection_active(conn, db)
    return {"clients": clients, "total": len(clients)}


@router.get("/client/{client_id}")
@limiter.limit("30/minute")
def get_client_details_endpoint(
    client_id: int,
    request: Request,
    user: User = Depends(require_permission("admin:client_onboarding")),
    db: Session = Depends(get_db),
):
    """Fetch full client configuration for editing (group, BEIDs, reports, aliases)."""
    if client_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid client_id")

    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        details = fetch_client_details(connector, client_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch client {client_id}: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch client details") from e

    mark_connection_active(conn, db)
    return details


@router.put("/update")
@limiter.limit("5/minute")
def update_client_endpoint(
    request: Request,
    payload: EditClientRequest,
    user: User = Depends(require_permission("admin:client_onboarding")),
    db: Session = Depends(get_db),
):
    """
    Execute diff-based edits on an existing client.
    Computes what changed and executes INSERTs/DELETEs/UPDATEs atomically.
    """
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        # Fetch current state
        current = fetch_client_details(connector, payload.client_id)

        # Fetch report metadata for any new reports
        all_report_ids = list(set(current["report_ids"]) | set(payload.report_ids))
        report_map = fetch_report_map(connector, all_report_ids)

        # Build diff-based statements
        edit_result = build_edit_statements(
            client_id=payload.client_id,
            client_name=current["client_name"],
            group_id=current["group_id"],
            group_name=current["group_name"],
            new_group_name=payload.group_name,
            current_beids=current["beid_mappings"],
            new_beids=payload.beid_org_mappings,
            current_report_ids=current["report_ids"],
            new_report_ids=payload.report_ids,
            report_map=report_map,
            current_aliases=current["fastie_aliases"],
            new_aliases=payload.fastie_aliases,
        )

        statements = edit_result["statements"]
        diff = edit_result["diff"]

        # If no changes, return early
        if not statements:
            return {
                "success": True,
                "client_id": payload.client_id,
                "client_name": current["client_name"],
                "message": "No changes detected",
                "total_statements": 0,
                "executed": 0,
                "skipped": 0,
                "diff": diff,
            }

        # Execute all atomically
        result, metrics = track_transaction(connector, statements)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Client edit failed for client_id={payload.client_id}: {e}")
        mark_connection_failed(conn, db)

        # Audit the failure
        from app.services.audit_chain import seal_and_persist

        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            connection_id=conn.id,
            connection_name=conn.name,
            operation="EDIT_CLIENT",
            table_name="client_details",
            row_count=0,
            query_preview=f"FAILED EDIT: client_id={payload.client_id}",
            status="failed",
            error_message=str(e)[:500],
        )
        seal_and_persist(audit, db)
        raise HTTPException(
            status_code=500,
            detail=f"Client edit failed: {str(e)[:200]}",
        ) from e

    mark_connection_active(conn, db)

    # Build audit summary
    diff = edit_result["diff"]
    changes_summary = []
    if diff["group_name_changed"]:
        changes_summary.append(f"group: '{diff['old_group_name']}' → '{diff['new_group_name']}'")
    if diff["beids_added"]:
        changes_summary.append(f"+{len(diff['beids_added'])} BEIDs")
    if diff["beids_removed"]:
        changes_summary.append(f"-{len(diff['beids_removed'])} BEIDs")
    if diff["reports_added"]:
        changes_summary.append(f"+{len(diff['reports_added'])} reports")
    if diff["reports_removed"]:
        changes_summary.append(f"-{len(diff['reports_removed'])} reports")
    if diff["aliases_added"]:
        changes_summary.append(f"+{len(diff['aliases_added'])} aliases")
    if diff["aliases_removed"]:
        changes_summary.append(f"-{len(diff['aliases_removed'])} aliases")

    query_preview = (
        f"EDIT_CLIENT client_id={payload.client_id} "
        f"client_name={current['client_name']} | " + ", ".join(changes_summary)
    )

    # Record in audit log
    from app.services.audit_chain import seal_and_persist

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        connection_id=conn.id,
        connection_name=conn.name,
        operation="EDIT_CLIENT",
        table_name="client_details,groups,beid_mapping,report_mapping,aliases",
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

    return {
        "success": True,
        "client_id": payload.client_id,
        "client_name": current["client_name"],
        "total_statements": len(statements),
        "executed": result["executed"],
        "skipped": result["skipped"],
        "diff": diff,
    }
