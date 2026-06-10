"""
Query Metrics — Captures full execution details for every database query.

Usage:
    from app.services.query_metrics import track_query, track_transaction

    # For read queries:
    result, metrics = track_query(connector, sql, params)

    # For transaction (multi-statement):
    result, metrics = track_transaction(connector, statements)

Metrics captured:
    - total_time_ms: end-to-end wall time
    - row_count: number of rows returned/affected
    - peak_memory_bytes: memory delta during execution
    - cpu_time_s: CPU time consumed
    - status: "success" or "failed"
    - error_message: if failed
"""

import os
import time
from dataclasses import dataclass
from typing import Any, Optional

import psutil


@dataclass
class QueryMetrics:
    """Detailed metrics for a single query or transaction execution."""

    total_time_ms: int = 0
    row_count: int = 0
    rows_inserted: int = 0
    rows_skipped: int = 0
    peak_memory_bytes: int = 0
    cpu_time_s: float = 0.0
    status: str = "success"
    error_message: Optional[str] = None
    query_preview: str = ""


def _snap_resources():
    """Capture current process resource snapshot."""
    proc = psutil.Process(os.getpid())
    mem = proc.memory_info()
    cpu = proc.cpu_times()
    return {"rss": mem.rss, "cpu_user": cpu.user, "cpu_system": cpu.system}


def track_query(
    connector: Any,
    sql: str,
    params: Optional[dict] = None,
) -> tuple[list[dict], QueryMetrics]:
    """
    Execute a read query and capture full metrics.
    Returns (results, metrics).
    """
    metrics = QueryMetrics(query_preview=sql[:500])
    snap_before = _snap_resources()
    start = time.time()

    try:
        results = connector.execute_query(sql, params or {})
        metrics.row_count = len(results) if results else 0
        metrics.status = "success"
    except Exception as e:
        metrics.status = "failed"
        metrics.error_message = str(e)[:500]
        results = []

    elapsed = time.time() - start
    snap_after = _snap_resources()

    metrics.total_time_ms = int(elapsed * 1000)
    metrics.peak_memory_bytes = max(0, snap_after["rss"] - snap_before["rss"])
    metrics.cpu_time_s = round(
        (snap_after["cpu_user"] - snap_before["cpu_user"]) + (snap_after["cpu_system"] - snap_before["cpu_system"]),
        3,
    )

    return results, metrics


def track_transaction(
    connector: Any,
    statements: list[dict[str, Any]],
) -> tuple[dict[str, int], QueryMetrics]:
    """
    Execute a transaction (skip-conflicts mode) and capture full metrics.
    Returns ({"executed": N, "skipped": M}, metrics).
    """
    metrics = QueryMetrics(query_preview=f"TRANSACTION: {len(statements)} statements")
    snap_before = _snap_resources()
    start = time.time()

    try:
        result = connector.execute_transaction_skip_conflicts(statements)
        metrics.rows_inserted = result["executed"]
        metrics.rows_skipped = result["skipped"]
        metrics.row_count = len(statements)
        metrics.status = "success"
    except Exception as e:
        metrics.status = "failed"
        metrics.error_message = str(e)[:500]
        result = {"executed": 0, "skipped": 0}

    elapsed = time.time() - start
    snap_after = _snap_resources()

    metrics.total_time_ms = int(elapsed * 1000)
    metrics.peak_memory_bytes = max(0, snap_after["rss"] - snap_before["rss"])
    metrics.cpu_time_s = round(
        (snap_after["cpu_user"] - snap_before["cpu_user"]) + (snap_after["cpu_system"] - snap_before["cpu_system"]),
        3,
    )

    return result, metrics
