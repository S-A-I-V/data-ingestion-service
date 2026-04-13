"""
CSV parsing and validation — extracted from ingestion router.
Handles file reading, row parsing, and data quality metrics.
"""

from __future__ import annotations

import csv
import io


def parse_csv(content: bytes, csv_cols: list[str]) -> dict:
    """Parse CSV content and return rows + quality metrics.

    Returns dict with: rows, total_parsed, error_rows, empty_cells
    """
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    rows = []
    total_parsed = 0
    error_rows = 0
    empty_cells = 0

    for row in reader:
        total_parsed += 1
        parsed_row = []
        row_ok = True
        for c in csv_cols:
            val = (row.get(c) or "").strip()
            if not val:
                empty_cells += 1
            parsed_row.append(val)
        if row_ok:
            rows.append(parsed_row)
        else:
            error_rows += 1

    return {
        "rows": rows,
        "total_parsed": total_parsed,
        "error_rows": error_rows,
        "empty_cells": empty_cells,
    }


def preview_csv(content: bytes) -> dict:
    """Parse full CSV for preview. Returns headers, rows, total_rows, file_size."""
    file_size_bytes = len(content)
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []

    rows = list(reader)

    return {
        "headers": headers,
        "preview": rows,
        "total_rows": len(rows),
        "file_size_bytes": file_size_bytes,
        "total_hint": len(rows),
    }


def estimate_data_size(rows: list[list[str]]) -> int:
    """Estimate the byte size of parsed row data."""
    return sum(sum(len(cell.encode("utf-8")) for cell in row) for row in rows)
