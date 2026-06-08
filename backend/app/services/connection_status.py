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
    except Exception as e:
        logger.warning(f"Failed to update connection status for {conn.id}: {e}")
        db.rollback()


def mark_connection_failed(conn: DBConnection, db: Session) -> None:
    """Mark a connection as failed after an error."""
    try:
        conn.last_tested_at = datetime.now(timezone.utc)
        conn.last_test_ok = False
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to update connection status for {conn.id}: {e}")
        db.rollback()
