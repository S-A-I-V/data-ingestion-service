"""
Audit log router — paginated history, aggregated metrics, integrity verification.

Scalability notes:
  - All list endpoints are paginated with configurable limits
  - Metrics use a materialized view (pre-computed, O(1) reads)
  - Integrity verification is paginated to avoid loading all records
  - Total count queries use indexed columns
"""

import logging

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.routers.auth import get_current_user, limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/metrics")
@limiter.limit("30/minute")
def get_audit_metrics(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return aggregated execution metrics from the materialized view.
    The view is refreshed CONCURRENTLY after each ingestion — reads are never blocked.
    """
    from sqlalchemy import text

    try:
        row = db.execute(
            text(
                """
                SELECT
                    total_operations,
                    successful,
                    failed,
                    success_rate,
                    total_rows_inserted,
                    total_rows_skipped,
                    total_data_ingested_bytes,
                    total_time_ms,
                    avg_throughput_rps,
                    peak_throughput_rps,
                    avg_duration_ms,
                    avg_validation_score,
                    total_error_rows,
                    total_duplicates,
                    peak_memory_bytes,
                    total_cpu_time_s
                FROM audit_metrics_mv
                WHERE user_id = :uid
                """
            ),
            {"uid": user.id},
        ).fetchone()
    except Exception as e:
        logger.warning("metrics_view_query_failed", extra={"error": str(e)[:200], "user_id": user.id})
        row = None

    if not row:
        return {
            "total_operations": 0,
            "successful": 0,
            "failed": 0,
            "success_rate": 0,
            "total_rows_inserted": 0,
            "total_rows_skipped": 0,
            "total_data_ingested_bytes": 0,
            "total_time_ms": 0,
            "avg_throughput_rps": 0,
            "peak_throughput_rps": 0,
            "avg_duration_ms": 0,
            "avg_validation_score": 0,
            "total_error_rows": 0,
            "total_duplicates": 0,
            "peak_memory_bytes": 0,
            "total_cpu_time_s": 0,
        }

    return {
        "total_operations": int(row.total_operations),
        "successful": int(row.successful),
        "failed": int(row.failed),
        "success_rate": float(row.success_rate or 0),
        "total_rows_inserted": int(row.total_rows_inserted),
        "total_rows_skipped": int(row.total_rows_skipped),
        "total_data_ingested_bytes": int(row.total_data_ingested_bytes),
        "total_time_ms": int(row.total_time_ms),
        "avg_throughput_rps": float(row.avg_throughput_rps),
        "peak_throughput_rps": float(row.peak_throughput_rps),
        "avg_duration_ms": int(row.avg_duration_ms),
        "avg_validation_score": float(row.avg_validation_score),
        "total_error_rows": int(row.total_error_rows),
        "total_duplicates": int(row.total_duplicates),
        "peak_memory_bytes": int(row.peak_memory_bytes),
        "total_cpu_time_s": float(row.total_cpu_time_s),
    }


@router.get("/")
@limiter.limit("30/minute")
def get_audit_logs(
    request: Request,
    limit: int = Query(50, ge=1, le=500, description="Max items to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    status: str = Query(None, description="Filter by status: success|failed"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Audit log list with optional status filter and pagination.
    Returns a flat array for backward compatibility.
    """
    query = db.query(AuditLog).filter(AuditLog.user_id == user.id)

    # Optional status filter
    if status and status in ("success", "failed"):
        query = query.filter(AuditLog.status == status)

    logs = query.order_by(AuditLog.executed_at.desc()).offset(offset).limit(limit).all()

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
            "rows_inserted": entry.rows_inserted,
            "rows_skipped": entry.rows_skipped,
            "throughput_rps": entry.throughput_rps,
            "total_time_ms": entry.total_time_ms,
        }
        for entry in logs
    ]


@router.get("/verify-integrity")
@limiter.limit("5/minute")
def verify_audit_integrity(
    request: Request,
    limit: int = Query(1000, ge=100, le=10000, description="Max records to verify"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verify the audit log hash chain integrity.

    Checks up to `limit` records at a time for performance.
    Returns the first broken link if tampered.
    """
    logs = db.query(AuditLog).order_by(AuditLog.id.asc()).limit(limit).all()

    if not logs:
        return {"ok": True, "message": "No audit logs to verify", "total": 0, "verified": 0}

    prev_hash = None
    verified = 0

    for i, log in enumerate(logs):
        if not log.record_hash:
            continue  # Skip legacy records without hashes
        if log.prev_hash == "ERROR_CHAIN_BREAK":
            continue  # Skip known chain breaks from error recovery

        expected = log.compute_hash()
        if log.record_hash != expected:
            logger.warning(
                "audit_integrity_violation",
                extra={"record_id": log.id, "position": i},
            )
            return {
                "ok": False,
                "message": f"Integrity violation at record #{log.id}",
                "record_id": log.id,
                "expected_hash": expected,
                "stored_hash": log.record_hash,
                "position": i,
                "verified": verified,
            }
        if prev_hash and log.prev_hash != prev_hash:
            logger.warning(
                "audit_chain_break",
                extra={"record_id": log.id, "position": i},
            )
            return {
                "ok": False,
                "message": f"Chain break at record #{log.id}",
                "record_id": log.id,
                "position": i,
                "verified": verified,
            }
        prev_hash = log.record_hash
        verified += 1

    total = db.query(AuditLog).count()

    return {
        "ok": True,
        "message": "Audit log integrity verified",
        "verified": verified,
        "total": total,
        "fully_verified": verified >= total,
    }
