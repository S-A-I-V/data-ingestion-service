"""
Connection status tracking — marks connections as active/tested
after successful usage in admin tools (associate lookup, onboarding, etc).

This ensures the Dashboard shows green status badges for connections
that have been recently used, without requiring a manual "Test" click.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.connection import DBConnection

logger = logging.getLogger(__name__)


def mark_connection_active(conn: DBConnection, db: Session) -> None:
    """
    Mark a connection as successfully used (green badge in Dashboard).
    Updates last_tested_at and last_test_ok so the frontend status
    logic considers it "connected".
    """
    try:
        conn.last_tested_at = datetime.now(timezone.utc)
        conn.last_test_ok = True
        db.commit()
        logger.debug(
            "connection_marked_active",
            extra={"connection_id": conn.id, "db_type": conn.db_type},
        )
    except Exception as e:
        logger.warning(
            "connection_status_update_failed",
            extra={"connection_id": conn.id, "action": "mark_active", "error": str(e)[:200]},
        )
        db.rollback()


def mark_connection_failed(conn: DBConnection, db: Session) -> None:
    """
    Mark a connection as failed (red badge in Dashboard).
    """
    try:
        conn.last_tested_at = datetime.now(timezone.utc)
        conn.last_test_ok = False
        db.commit()
        logger.info(
            "connection_marked_failed",
            extra={"connection_id": conn.id, "db_type": conn.db_type},
        )
    except Exception as e:
        logger.warning(
            "connection_status_update_failed",
            extra={"connection_id": conn.id, "action": "mark_failed", "error": str(e)[:200]},
        )
        db.rollback()
