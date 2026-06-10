"""
Migration: Set up audit log retention policy.

Creates a function and (optional) scheduled job to archive/delete old audit logs.
Default retention: 365 days (configurable via AUDIT_RETENTION_DAYS).

Strategy:
  1. Records older than retention period are moved to audit_logs_archive
  2. Archived records are kept for compliance (can be purged separately)
  3. The archive table has the same schema minus the hash chain

Run with: python3 migrate_audit_retention.py
"""

from sqlalchemy import text

from app.config import settings
from app.database import engine

RETENTION_DAYS = settings.AUDIT_RETENTION_DAYS

CREATE_ARCHIVE_TABLE = """
CREATE TABLE IF NOT EXISTS audit_logs_archive (
    LIKE audit_logs INCLUDING ALL
);
"""

CREATE_ARCHIVE_FUNCTION = """
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
    retention_days INTEGER := {RETENTION_DAYS};
BEGIN
    -- Move old records to archive
    WITH moved AS (
        DELETE FROM audit_logs
        WHERE executed_at < NOW() - (retention_days || ' days')::INTERVAL
        RETURNING *
    )
    INSERT INTO audit_logs_archive
    SELECT * FROM moved;

    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
"""

# Comment for cron job setup (requires pg_cron extension)
CRON_COMMENT = """
-- To schedule automatic archival (requires pg_cron):
-- SELECT cron.schedule('archive-audit-logs', '0 3 * * 0', 'SELECT archive_old_audit_logs()');
"""


def migrate():
    with engine.connect() as conn:
        print("Creating audit_logs_archive table...")
        conn.execute(text(CREATE_ARCHIVE_TABLE))
        conn.commit()
        print("  \u2713 Archive table created")

        print("Creating archive_old_audit_logs() function...")
        conn.execute(text(CREATE_ARCHIVE_FUNCTION))
        conn.commit()
        print(f"  \u2713 Function created (retention: {RETENTION_DAYS} days)")

        # Count records that would be archived
        result = conn.execute(
            text("SELECT COUNT(*) FROM audit_logs " "WHERE executed_at < NOW() - (:days || ' days')::INTERVAL"),
            {"days": RETENTION_DAYS},
        ).scalar()
        print(f"  \u2139 Records eligible for archival: {result}")

        print(f"\n\u2705 Retention policy configured ({RETENTION_DAYS} days).")
        print("   Run: SELECT archive_old_audit_logs(); to archive now.")
        print("   Or set up pg_cron for weekly automated archival.")


if __name__ == "__main__":
    migrate()
