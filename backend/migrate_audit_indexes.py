"""
Migration: Add performance indexes to audit_logs table.

These indexes support the common query patterns:
  - Per-user dashboard (user_id + executed_at)
  - Connection-specific history (connection_id + executed_at)
  - Failed operation monitoring (status + executed_at)
  - Time-range queries for retention (executed_at)

Run with: python3 migrate_audit_indexes.py
"""

from sqlalchemy import text

from app.database import engine

INDEXES = [
    ("idx_audit_user_time", "CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_logs (user_id, executed_at DESC)"),
    (
        "idx_audit_connection_time",
        "CREATE INDEX IF NOT EXISTS idx_audit_connection_time ON audit_logs (connection_id, executed_at DESC)",
    ),
    (
        "idx_audit_status_time",
        "CREATE INDEX IF NOT EXISTS idx_audit_status_time ON audit_logs (status, executed_at DESC)",
    ),
    ("idx_audit_executed_at", "CREATE INDEX IF NOT EXISTS idx_audit_executed_at ON audit_logs (executed_at DESC)"),
]


def migrate():
    with engine.connect() as conn:
        for name, sql in INDEXES:
            try:
                conn.execute(text(sql))
                print(f"  \u2713 Created index: {name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"  \u2013 Index exists: {name}")
                else:
                    print(f"  \u2717 Failed to create {name}: {e}")
                    raise
        conn.commit()

    print("\n\u2705 Audit indexes migration complete.")


if __name__ == "__main__":
    migrate()
