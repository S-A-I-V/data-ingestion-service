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
