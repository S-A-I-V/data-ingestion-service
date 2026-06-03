"""
One-time migration: Add execution metrics columns to audit_logs table.
Run with: python3 migrate_add_metrics.py
"""

from app.database import engine

COLUMNS = [
    ("rows_inserted", "INTEGER"),
    ("rows_skipped", "INTEGER"),
    ("throughput_rps", "DOUBLE PRECISION"),
    ("file_size_bytes", "BIGINT"),
    ("data_size_bytes", "BIGINT"),
    ("parse_time_ms", "INTEGER"),
    ("ingestion_time_ms", "INTEGER"),
    ("total_time_ms", "INTEGER"),
    ("error_rows", "INTEGER"),
    ("duplicate_count", "INTEGER"),
    ("validation_score", "DOUBLE PRECISION"),
    ("peak_memory_bytes", "BIGINT"),
    ("cpu_time_s", "DOUBLE PRECISION"),
]


def migrate():
    with engine.connect() as conn:
        for col_name, col_type in COLUMNS:
            try:
                conn.execute(__import__("sqlalchemy").text(f"ALTER TABLE audit_logs ADD COLUMN {col_name} {col_type}"))
                print(f"  ✓ Added {col_name} ({col_type})")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"  – {col_name} already exists, skipping")
                else:
                    raise
        conn.commit()
    print("\n✅ Migration complete.")


if __name__ == "__main__":
    migrate()
