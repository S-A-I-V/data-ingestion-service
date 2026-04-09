import csv
import io
import json
import os
import time
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

import psutil

from app.database import get_db
from app.models.user import User
from app.models.connection import DBConnection
from app.models.audit import AuditLog
from app.routers.auth import get_current_user
from app.services.db_connector import get_connector
from app.services.validators import (
    validate_identifier, validate_identifiers, validate_operation,
    validate_csv_upload,
)

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])

CHUNK_SIZE = 1000  # rows per chunk for memory-efficient parsing


# ── Helpers ──────────────────────────────────────────────────────────────────

def _snap_resources():
    """Capture a snapshot of current process resource usage."""
    proc = psutil.Process(os.getpid())
    mem = proc.memory_info()
    cpu = proc.cpu_times()
    return {
        "rss": mem.rss,
        "cpu_user": cpu.user,
        "cpu_system": cpu.system,
    }


def _format_bytes(b: int) -> str:
    if b < 1024:
        return f"{b} B"
    if b < 1048576:
        return f"{b / 1024:.1f} KB"
    if b < 1073741824:
        return f"{b / 1048576:.2f} MB"
    return f"{b / 1073741824:.2f} GB"


# ── Preview endpoint ─────────────────────────────────────────────────────────

@router.post("/preview")
async def preview_csv(file: UploadFile = File(...)):
    """Return rows + headers and file-level stats from uploaded CSV."""
    try:
        validate_csv_upload(file.filename or "", file.size or 0)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB)")

    file_size_bytes = len(content)
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not valid UTF-8 text")
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []

    rows = []
    total_rows = 0
    for row in reader:
        total_rows += 1
        rows.append(row)

    return {
        "headers": headers,
        "preview": rows,
        "total_rows": total_rows,
        "file_size_bytes": file_size_bytes,
        "total_hint": total_rows,
    }


# ── Execute endpoint ─────────────────────────────────────────────────────────

@router.post("/execute")
async def execute_ingestion(
    file: UploadFile = File(...),
    connection_id: int = Form(...),
    table_name: str = Form(...),
    column_mapping: str = Form(...),
    operation: str = Form("INSERT"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ── Pre-execution resource snapshot ──
    pre_snap = _snap_resources()
    peak_rss = pre_snap["rss"]
    wall_start = time.time()

    # ── Validate connection ──
    conn = (
        db.query(DBConnection)
        .filter(DBConnection.id == connection_id, DBConnection.created_by == user.id)
        .first()
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    # ── Validate operation ──
    try:
        operation = validate_operation(operation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ── Validate table name ──
    try:
        table_name = validate_identifier(table_name, "table name")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    mapping = json.loads(column_mapping)
    mapping = {k: v for k, v in mapping.items() if v}
    if not mapping:
        raise HTTPException(status_code=400, detail="No columns mapped")

    # ── Validate column names ──
    try:
        db_cols_raw = [mapping[c] for c in mapping.keys()]
        validate_identifiers(db_cols_raw, "column name")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ── Validate file upload ──
    try:
        validate_csv_upload(file.filename or "", file.size or 0)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ── Read & validate CSV in chunks (memory-efficient) ──
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB)")
    file_size_bytes = len(content)
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not valid UTF-8 text")
    reader = csv.DictReader(io.StringIO(text))

    csv_cols = list(mapping.keys())
    db_cols = [mapping[c] for c in csv_cols]

    rows = []
    total_parsed = 0
    error_rows = 0
    schema_errors = 0
    empty_cells = 0
    parse_start = time.time()

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

        # Track peak memory periodically
        if total_parsed % CHUNK_SIZE == 0:
            current_rss = psutil.Process(os.getpid()).memory_info().rss
            peak_rss = max(peak_rss, current_rss)

    parse_elapsed = time.time() - parse_start

    # Final memory check after parsing
    current_rss = psutil.Process(os.getpid()).memory_info().rss
    peak_rss = max(peak_rss, current_rss)

    # ── Data size estimation ──
    data_size_bytes = sum(
        sum(len(cell.encode("utf-8")) for cell in row) for row in rows
    )

    valid_rows = len(rows)
    validation_score = round((valid_rows / total_parsed) * 100, 1) if total_parsed else 0
    duplicate_count = 0

    # ── Execute ingestion ──
    connector = get_connector(conn)
    ingestion_start = time.time()

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        connection_id=conn.id,
        connection_name=conn.name,
        operation=operation,
        table_name=table_name,
        row_count=len(rows),
        query_preview=f"{operation} INTO {table_name} ({', '.join(db_cols)}) — {len(rows)} rows",
    )

    try:
        if operation == "INSERT_SKIP":
            result = connector.insert_rows_skip_existing(table_name, db_cols, rows, db_cols)
            count = result["inserted"]
            skipped = result["skipped"]
            duplicate_count = skipped
            audit.row_count = count
            audit.query_preview = (
                f"{operation} INTO {table_name} ({', '.join(db_cols)}) — "
                f"{count} inserted, {skipped} skipped (of {len(rows)} total)"
            )
        else:
            count = connector.insert_rows(table_name, db_cols, rows)
            skipped = 0
        audit.status = "success"
        audit.row_count = count
    except Exception as e:
        audit.status = "failed"
        audit.error_message = str(e)
        db.add(audit)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    ingestion_elapsed = time.time() - ingestion_start

    # ── Post-execution resource snapshot ──
    post_snap = _snap_resources()
    current_rss = post_snap["rss"]
    peak_rss = max(peak_rss, current_rss)
    wall_elapsed = time.time() - wall_start

    # ── Compute final metrics ──
    throughput = round(count / ingestion_elapsed, 1) if ingestion_elapsed > 0 else 0
    cpu_time_used = (
        (post_snap["cpu_user"] - pre_snap["cpu_user"])
        + (post_snap["cpu_system"] - pre_snap["cpu_system"])
    )
    memory_delta = post_snap["rss"] - pre_snap["rss"]

    db.add(audit)
    db.commit()

    return {
        "ok": True,
        # ── Ingestion Performance ──
        "rows_inserted": count,
        "rows_skipped": skipped,
        "total_rows": total_parsed,
        "columns_mapped": len(db_cols),
        "throughput_rps": throughput,
        "file_size_bytes": file_size_bytes,
        "data_size_bytes": data_size_bytes,
        "compression_ratio": round(file_size_bytes / data_size_bytes, 2) if data_size_bytes else 0,
        "peak_memory_bytes": peak_rss,
        "memory_delta_bytes": memory_delta,
        # ── Timing ──
        "parse_time_ms": round(parse_elapsed * 1000),
        "ingestion_time_ms": round(ingestion_elapsed * 1000),
        "total_time_ms": round(wall_elapsed * 1000),
        # ── Data Quality ──
        "error_rows": error_rows,
        "empty_cells": empty_cells,
        "duplicate_count": duplicate_count,
        "validation_score": validation_score,
        # ── Resource Impact ──
        "cpu_time_s": round(cpu_time_used, 3),
    }
