from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/")
def get_audit_logs(
    limit: int = Query(50, le=500),
    offset: int = Query(0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = db.query(AuditLog).order_by(AuditLog.executed_at.desc()).offset(offset).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_email": l.user_email,
            "connection_name": l.connection_name,
            "operation": l.operation,
            "table_name": l.table_name,
            "row_count": l.row_count,
            "query_preview": l.query_preview,
            "ai_suggestion": l.ai_suggestion,
            "status": l.status,
            "error_message": l.error_message,
            "executed_at": l.executed_at.isoformat() if l.executed_at else None,
        }
        for l in logs
    ]


@router.get("/verify-integrity")
def verify_audit_integrity(
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
