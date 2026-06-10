"""
Backfill estimated metrics for older audit log records.

Strategy:
1. Find records that HAVE full metrics (total_time_ms is not NULL)
2. Calculate average throughput (rows/sec) from those records
3. For records missing metrics, estimate based on row_count + avg throughput
4. Estimate memory based on data_size_bytes (2.5x multiplier)
5. Mark estimated records in query_preview with [ESTIMATED] tag

Run: python migrate_backfill_metrics.py
"""

from app.database import SessionLocal
from app.models.audit import AuditLog

# Estimation constants
DEFAULT_THROUGHPUT_RPS = 200  # fallback if no reference data
MEMORY_MULTIPLIER = 2.5  # estimated peak_memory = data_size * 2.5
MIN_TIME_MS = 50  # minimum estimated time for any operation
CPU_PER_ROW_S = 0.0001  # estimated CPU seconds per row


def run():
    db = SessionLocal()

    try:
        # Step 1: Calculate average throughput from records WITH metrics
        records_with_metrics = (
            db.query(AuditLog)
            .filter(
                AuditLog.total_time_ms.isnot(None),
                AuditLog.total_time_ms > 0,
                AuditLog.rows_inserted.isnot(None),
                AuditLog.rows_inserted > 0,
            )
            .all()
        )

        if records_with_metrics:
            total_rows = sum(r.rows_inserted for r in records_with_metrics)
            total_time_s = sum(r.total_time_ms for r in records_with_metrics) / 1000
            avg_throughput = total_rows / total_time_s if total_time_s > 0 else DEFAULT_THROUGHPUT_RPS
            print(f"Reference data: {len(records_with_metrics)} records with metrics")
            print(f"Average throughput: {avg_throughput:.1f} rows/sec")
        else:
            avg_throughput = DEFAULT_THROUGHPUT_RPS
            print(f"No reference data found. Using default throughput: {avg_throughput} rows/sec")

        # Step 2: Find records WITHOUT metrics
        records_to_backfill = db.query(AuditLog).filter(AuditLog.total_time_ms.is_(None)).all()

        print(f"\nRecords to backfill: {len(records_to_backfill)}")

        if not records_to_backfill:
            print("Nothing to backfill. All records have metrics.")
            return

        # Step 3: Estimate and update
        updated = 0
        for record in records_to_backfill:
            rows = record.rows_inserted or record.row_count or 1

            # Estimate total_time_ms
            estimated_time_ms = max(
                MIN_TIME_MS,
                int((rows / avg_throughput) * 1000),
            )

            # Estimate throughput
            estimated_rps = rows / (estimated_time_ms / 1000) if estimated_time_ms > 0 else 0

            # Estimate memory from data size
            data_size = record.data_size_bytes or record.file_size_bytes or 0
            estimated_memory = int(data_size * MEMORY_MULTIPLIER) if data_size else None

            # Estimate CPU time
            estimated_cpu = round(rows * CPU_PER_ROW_S, 3)

            # Update the record
            record.total_time_ms = estimated_time_ms
            record.throughput_rps = round(estimated_rps, 1)

            if estimated_memory and not record.peak_memory_bytes:
                record.peak_memory_bytes = estimated_memory

            if not record.cpu_time_s:
                record.cpu_time_s = estimated_cpu

            # Tag as estimated in query_preview
            if record.query_preview and "[ESTIMATED]" not in record.query_preview:
                record.query_preview = f"[ESTIMATED] {record.query_preview}"
            elif not record.query_preview:
                record.query_preview = "[ESTIMATED] metrics backfilled"

            updated += 1

        db.commit()
        print(f"\nBackfilled {updated} records with estimated metrics.")
        print(f"  - Avg throughput used: {avg_throughput:.1f} rows/sec")
        print(f"  - Memory multiplier: {MEMORY_MULTIPLIER}x data_size")
        print("  - Tagged with [ESTIMATED] in query_preview")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
