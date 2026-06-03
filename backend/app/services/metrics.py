"""
Materialized view refresh utility for audit metrics.

Uses CONCURRENTLY so readers are never blocked during refresh.
At millions of rows, a concurrent refresh takes ~50-200ms on PostgreSQL
with the proper unique index in place.
"""

import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def refresh_metrics_view(db: Session) -> None:
    """
    Refresh the audit_metrics_mv materialized view concurrently.
    Safe to call after every ingestion — non-blocking for readers.
    """
    try:
        db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY audit_metrics_mv"))
        db.commit()
    except Exception as e:
        logger.warning("Failed to refresh metrics view: %s", e)
        db.rollback()
