"""
Migration: Create materialized view for audit metrics aggregation.
Run with: python3 migrate_create_metrics_view.py

This view pre-computes per-user metrics from audit_logs.
Refresh strategy: CONCURRENTLY after each ingestion (non-blocking reads).
"""

from sqlalchemy import text

from app.database import engine

CREATE_VIEW = """
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_metrics_mv AS
SELECT
    user_id,
    COUNT(*)::INTEGER                                   AS total_operations,
    COUNT(*) FILTER (WHERE status = 'success')::INTEGER AS successful,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER  AS failed,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1
    )                                                   AS success_rate,
    COALESCE(SUM(rows_inserted), 0)::BIGINT             AS total_rows_inserted,
    COALESCE(SUM(rows_skipped), 0)::BIGINT              AS total_rows_skipped,
    COALESCE(SUM(file_size_bytes), 0)::BIGINT           AS total_data_ingested_bytes,
    COALESCE(SUM(total_time_ms), 0)::BIGINT             AS total_time_ms,
    ROUND(COALESCE(AVG(throughput_rps), 0)::NUMERIC, 1) AS avg_throughput_rps,
    ROUND(COALESCE(MAX(throughput_rps), 0)::NUMERIC, 1) AS peak_throughput_rps,
    ROUND(COALESCE(AVG(total_time_ms), 0)::NUMERIC)     AS avg_duration_ms,
    ROUND(COALESCE(AVG(validation_score), 0)::NUMERIC, 1) AS avg_validation_score,
    COALESCE(SUM(error_rows), 0)::INTEGER               AS total_error_rows,
    COALESCE(SUM(duplicate_count), 0)::INTEGER          AS total_duplicates,
    COALESCE(MAX(peak_memory_bytes), 0)::BIGINT         AS peak_memory_bytes,
    ROUND(COALESCE(SUM(cpu_time_s), 0)::NUMERIC, 2)    AS total_cpu_time_s
FROM audit_logs
GROUP BY user_id;
"""

# Unique index on user_id — required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE_INDEX = """
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_metrics_mv_user
ON audit_metrics_mv (user_id);
"""


def migrate():
    with engine.connect() as conn:
        print("Creating materialized view audit_metrics_mv...")
        conn.execute(text(CREATE_VIEW))
        conn.commit()
        print("  ✓ View created")

        print("Creating unique index for CONCURRENTLY refresh...")
        conn.execute(text(CREATE_INDEX))
        conn.commit()
        print("  ✓ Index created")

        # Initial population
        print("Refreshing view with current data...")
        conn.execute(text("REFRESH MATERIALIZED VIEW audit_metrics_mv"))
        conn.commit()
        print("  ✓ View populated")

    print("\n✅ Materialized view ready.")


if __name__ == "__main__":
    migrate()
