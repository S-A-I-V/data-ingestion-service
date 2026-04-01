import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.connection import DBConnection
from app.models.audit import AuditLog
from app.routers.auth import get_current_user
from app.services.db_connector import get_connector

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])


@router.post("/preview")
async def preview_csv(file: UploadFile = File(...)):
    """Return first 10 rows + headers from uploaded CSV."""
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []
    rows = []
    for i, row in enumerate(reader):
        if i >= 10:
            break
        rows.append(row)
    return {"headers": headers, "preview": rows, "total_hint": text.count("\n")}


@router.post("/execute")
async def execute_ingestion(
    file: UploadFile = File(...),
    connection_id: int = Form(...),
    table_name: str = Form(...),
    column_mapping: str = Form(...),  # JSON string: {"csv_col": "db_col", ...}
    operation: str = Form("INSERT"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import json

    conn = db.query(DBConnection).filter(DBConnection.id == connection_id, DBConnection.created_by == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    mapping = json.loads(column_mapping)  # {csv_col: db_col}
    # Filter out unmapped columns (where db_col is empty = "Skip")
    mapping = {k: v for k, v in mapping.items() if v}
    if not mapping:
        raise HTTPException(status_code=400, detail="No columns mapped")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    csv_cols = list(mapping.keys())
    db_cols = [mapping[c] for c in csv_cols]

    rows = []
    for row in reader:
        rows.append([row.get(c, "").strip() for c in csv_cols])

    connector = get_connector(conn)
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
            # Use all mapped columns as composite key for dedup
            result = connector.insert_rows_skip_existing(table_name, db_cols, rows, db_cols)
            count = result["inserted"]
            skipped = result["skipped"]
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

    db.add(audit)
    db.commit()
    return {"ok": True, "rows_inserted": count, "rows_skipped": skipped}
