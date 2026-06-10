"""
Audit hash-chain sealing with database-level locking.

The hash chain requires sequential consistency — each record must reference
the previous record's hash. Under concurrent writes, a naive SELECT last
record + INSERT can produce broken chains.

This module uses PostgreSQL advisory locks to serialize hash chain writes,
ensuring exactly-once ordering without blocking other tables/queries.
"""

import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.audit import AuditLog

logger = logging.getLogger(__name__)

# Advisory lock ID — arbitrary unique integer for this application
_AUDIT_CHAIN_LOCK_ID = 8675309


def seal_and_persist(audit: AuditLog, db: Session) -> None:
    """
    Seal an audit log entry with hash-chain integrity and persist it.

    Uses a PostgreSQL advisory lock to prevent concurrent writes from
    breaking the chain. The lock is held only for the duration of:
      1. Reading the last record's hash
      2. Computing and setting the new hash
      3. Flushing to DB

    The lock is transaction-scoped, so it releases on commit/rollback.
    """
    try:
        # Acquire advisory lock (blocks until available, transaction-scoped)
        db.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": _AUDIT_CHAIN_LOCK_ID})

        # Get the most recent record's hash
        last = db.query(AuditLog.record_hash).order_by(AuditLog.id.desc()).limit(1).scalar()

        # Seal this record
        audit.seal(prev_hash=last)

        # Persist
        db.add(audit)
        db.commit()

        logger.debug(
            "audit_log_sealed",
            extra={
                "audit_id": audit.id,
                "record_hash": audit.record_hash[:8],
                "prev_hash": (audit.prev_hash or "")[:8],
            },
        )
    except Exception as e:
        db.rollback()
        logger.error(
            "audit_seal_failed",
            extra={"error": str(e), "user_id": audit.user_id, "operation": audit.operation},
            exc_info=True,
        )
        # Fallback: persist without hash chain rather than losing audit data
        audit.prev_hash = "ERROR_CHAIN_BREAK"
        audit.record_hash = audit.compute_hash()
        db.add(audit)
        db.commit()
        logger.warning("audit_persisted_without_chain", extra={"audit_id": audit.id})
