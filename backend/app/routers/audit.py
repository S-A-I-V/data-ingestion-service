import logging

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.routers.auth import get_current_user, limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/")
@limiter.limit("30/minute")
def get_audit_logs(
    request: Request,
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == user.id)
        .order_by(AuditLog.executed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": entry.id,
            "user_email": entry.user_email,
            "connection_name": entry.connection_name,
            "operation": entry.operation,
            "table_name": entry.table_name,
            "row_count": entry.row_count,
            "query_preview": entry.query_preview,
            "ai_suggestion": entry.ai_suggestion,
            "status": entry.status,
            "error_message": entry.error_message,
            "executed_at": entry.executed_at.isoformat() if entry.executed_at else None,
        }
        for entry in logs
    ]


@router.get("/verify-integrity")
@limiter.limit("5/minute")
def verify_audit_integrity(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify the audit log hash chain. Returns first broken link if tampered."""
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    if not logs:
        return {"ok": True, "message": "No audit logs to verify", "total": 0}

    prev_hash = None
    for i, log in enumerate(logs):
        if not log.record_hash:
            continue  # Skip legacy records without hashes
        expected = log.compute_hash()
        if log.record_hash != expected:
            return {
                "ok": False,
                "message": f"Integrity violation at record #{log.id}",
                "record_id": log.id,
                "expected_hash": expected,
                "stored_hash": log.record_hash,
                "position": i,
            }
        if prev_hash and log.prev_hash != prev_hash:
            return {
                "ok": False,
                "message": f"Chain break at record #{log.id}",
                "record_id": log.id,
                "position": i,
            }
        prev_hash = log.record_hash

    return {"ok": True, "message": "Audit log integrity verified", "total": len(logs)}
