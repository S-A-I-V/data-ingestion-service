"""
Report Job Mapping — Admin tool for visual DAG editing of report→job pipelines.

Endpoints:
  - GET  /jobs              — List all job definitions from NFC Prod
  - GET  /existing          — List existing report mappings (grouped by report)
  - GET  /existing/:report_id — Get a specific report's job mapping as graph
  - GET  /saved             — List user's saved mappings
  - GET  /saved/:id         — Load a saved mapping
  - POST /saved             — Save new mapping
  - PUT  /saved/:id         — Update saved mapping
  - DELETE /saved/:id       — Delete saved mapping
  - GET  /export/:id        — Export mapping as CSV

Requires 'admin:report_mapping' permission.
"""

import csv
import io
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.report_mapping import SavedReportMapping
from app.models.user import User
from app.routers.auth import limiter
from app.services.connection_status import mark_connection_active, mark_connection_failed
from app.services.db_connector import get_connector
from app.services.onboarding.connection import find_nfc_connection
from app.services.rbac import require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/report-mapping", tags=["admin"])


# ── Schemas ───────────────────────────────────────────────────────────────────


class SaveMappingRequest(BaseModel):
    name: str
    report_name: str = ""
    application_name: str = ""
    mapping_data: dict

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Mapping name is required")
        if len(v) > 255:
            raise ValueError("Name must be under 255 characters")
        return v

    @field_validator("mapping_data")
    @classmethod
    def validate_data(cls, v: dict) -> dict:
        if "nodes" not in v or "edges" not in v:
            raise ValueError("mapping_data must contain 'nodes' and 'edges'")
        if not isinstance(v["nodes"], list) or not isinstance(v["edges"], list):
            raise ValueError("nodes and edges must be arrays")
        return v


class UpdateMappingRequest(SaveMappingRequest):
    pass


# ── NFC Prod Endpoints (read from remote DB) ─────────────────────────────────


@router.get("/jobs")
@limiter.limit("30/minute")
def list_jobs(
    request: Request,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """List all job definitions from NFC Prod."""
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        results = connector.execute_query(
            """
            SELECT job_id, job_name
            FROM public.job_definitions
            WHERE is_deleted = false OR is_deleted IS NULL
            ORDER BY job_name
            """,
            {},
        )
    except Exception as e:
        logger.error(f"Failed to fetch job definitions: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch jobs") from e

    mark_connection_active(conn, db)
    jobs = [dict(r) for r in results] if results else []
    return {"jobs": jobs, "total": len(jobs)}


@router.get("/existing")
@limiter.limit("30/minute")
def list_existing_mappings(
    request: Request,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """List existing report→job mappings grouped by report."""
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        results = connector.execute_query(
            """
            SELECT DISTINCT report_id, report_name, application_name,
                   COUNT(*) OVER (PARTITION BY report_id) as job_count
            FROM public.report_job_mapping
            ORDER BY report_name
            """,
            {},
        )
    except Exception as e:
        logger.error(f"Failed to fetch existing mappings: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch existing mappings") from e

    mark_connection_active(conn, db)
    reports = [dict(r) for r in results] if results else []
    return {"reports": reports, "total": len(reports)}


@router.get("/existing/{report_id}")
@limiter.limit("30/minute")
def get_existing_mapping(
    report_id: int,
    request: Request,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """Get an existing report's job mapping as a graph (nodes + edges)."""
    if report_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid report_id")

    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        results = connector.execute_query(
            """
            SELECT job_id, job_name, sequence_id, is_final_step,
                   job_category, report_name, application_name,
                   previous_job_ids, next_job_ids
            FROM public.report_job_mapping
            WHERE report_id = :rid
            ORDER BY sequence_id, job_name
            """,
            {"rid": report_id},
        )
    except Exception as e:
        logger.error(f"Failed to fetch mapping for report {report_id}: {e}")
        mark_connection_failed(conn, db)
        raise HTTPException(status_code=500, detail="Failed to fetch report mapping") from e

    mark_connection_active(conn, db)

    if not results:
        raise HTTPException(status_code=404, detail=f"No mapping found for report_id={report_id}")

    # Convert to graph format
    nodes = []
    edges = []
    report_name = results[0]["report_name"]
    application_name = results[0]["application_name"]

    # Position nodes in a grid layout
    for i, row in enumerate(results):
        col = i % 4
        row_num = i // 4
        nodes.append(
            {
                "id": f"n{row['job_id']}",
                "job_id": row["job_id"],
                "job_name": row["job_name"],
                "category": row.get("job_category", ""),
                "is_final_step": row.get("is_final_step", False),
                "position": {"x": col * 280, "y": row_num * 150},
            }
        )

    # Parse edges from previous_job_ids / next_job_ids
    for row in results:
        job_id = row["job_id"]
        next_ids_str = row.get("next_job_ids") or ""
        if next_ids_str:
            for nid in next_ids_str.split(","):
                nid = nid.strip()
                if nid:
                    edges.append(
                        {
                            "id": f"e{job_id}-{nid}",
                            "source": f"n{job_id}",
                            "target": f"n{nid}",
                        }
                    )

    return {
        "report_id": report_id,
        "report_name": report_name,
        "application_name": application_name,
        "mapping_data": {"nodes": nodes, "edges": edges},
    }


# ── Saved Mappings (local DB, per-user) ───────────────────────────────────────


@router.get("/saved")
@limiter.limit("30/minute")
def list_saved_mappings(
    request: Request,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """List user's saved report mappings."""
    mappings = (
        db.query(SavedReportMapping)
        .filter(SavedReportMapping.user_id == user.id)
        .order_by(SavedReportMapping.updated_at.desc())
        .all()
    )
    return {
        "mappings": [
            {
                "id": m.id,
                "name": m.name,
                "report_name": m.report_name,
                "application_name": m.application_name,
                "node_count": len(m.mapping_data.get("nodes", [])),
                "edge_count": len(m.mapping_data.get("edges", [])),
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None,
            }
            for m in mappings
        ],
        "total": len(mappings),
    }


@router.get("/saved/{mapping_id}")
@limiter.limit("30/minute")
def get_saved_mapping(
    mapping_id: int,
    request: Request,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """Load a saved mapping by ID (user-scoped)."""
    mapping = (
        db.query(SavedReportMapping)
        .filter(SavedReportMapping.id == mapping_id, SavedReportMapping.user_id == user.id)
        .first()
    )
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    return {
        "id": mapping.id,
        "name": mapping.name,
        "report_name": mapping.report_name,
        "application_name": mapping.application_name,
        "mapping_data": mapping.mapping_data,
        "created_at": mapping.created_at.isoformat() if mapping.created_at else None,
        "updated_at": mapping.updated_at.isoformat() if mapping.updated_at else None,
    }


@router.post("/saved")
@limiter.limit("10/minute")
def save_mapping(
    request: Request,
    payload: SaveMappingRequest,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """Save a new report mapping."""
    mapping = SavedReportMapping(
        user_id=user.id,
        name=payload.name,
        report_name=payload.report_name,
        application_name=payload.application_name,
        mapping_data=payload.mapping_data,
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)

    logger.info(
        "report_mapping_saved",
        extra={"user_id": user.id, "mapping_id": mapping.id, "mapping_name": payload.name},
    )

    return {"id": mapping.id, "message": "Mapping saved successfully"}


@router.put("/saved/{mapping_id}")
@limiter.limit("10/minute")
def update_mapping(
    mapping_id: int,
    request: Request,
    payload: UpdateMappingRequest,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """Update an existing saved mapping."""
    mapping = (
        db.query(SavedReportMapping)
        .filter(SavedReportMapping.id == mapping_id, SavedReportMapping.user_id == user.id)
        .first()
    )
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    mapping.name = payload.name
    mapping.report_name = payload.report_name
    mapping.application_name = payload.application_name
    mapping.mapping_data = payload.mapping_data
    db.commit()

    return {"id": mapping.id, "message": "Mapping updated successfully"}


@router.delete("/saved/{mapping_id}")
@limiter.limit("10/minute")
def delete_mapping(
    mapping_id: int,
    request: Request,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """Delete a saved mapping."""
    mapping = (
        db.query(SavedReportMapping)
        .filter(SavedReportMapping.id == mapping_id, SavedReportMapping.user_id == user.id)
        .first()
    )
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    db.delete(mapping)
    db.commit()
    return {"message": "Mapping deleted"}


@router.get("/export/{mapping_id}")
@limiter.limit("10/minute")
def export_mapping_csv(
    mapping_id: int,
    request: Request,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """Export a saved mapping as CSV (job_id, previous_job_ids, next_job_ids)."""
    mapping = (
        db.query(SavedReportMapping)
        .filter(SavedReportMapping.id == mapping_id, SavedReportMapping.user_id == user.id)
        .first()
    )
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    data = mapping.mapping_data
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    # Build adjacency maps
    prev_map: dict[str, list[str]] = {}  # node_id -> [source_node_ids]
    next_map: dict[str, list[str]] = {}  # node_id -> [target_node_ids]

    for edge in edges:
        src = edge["source"]
        tgt = edge["target"]
        next_map.setdefault(src, []).append(tgt)
        prev_map.setdefault(tgt, []).append(src)

    # Build CSV rows
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["job_id", "previous_job_ids", "next_job_ids"])

    for node in nodes:
        node_id = node["id"]
        job_id = node.get("job_id", "")

        # Get previous job_ids (sources pointing to this node)
        prev_nodes = prev_map.get(node_id, [])
        prev_job_ids = []
        for pn in prev_nodes:
            pnode = next((n for n in nodes if n["id"] == pn), None)
            if pnode and pnode.get("job_id"):
                prev_job_ids.append(str(pnode["job_id"]))

        # Get next job_ids (targets from this node)
        next_nodes = next_map.get(node_id, [])
        next_job_ids = []
        for nn in next_nodes:
            nnode = next((n for n in nodes if n["id"] == nn), None)
            if nnode and nnode.get("job_id"):
                next_job_ids.append(str(nnode["job_id"]))

        writer.writerow(
            [
                job_id,
                ",".join(prev_job_ids),
                ",".join(next_job_ids),
            ]
        )

    output.seek(0)
    filename = f"report_mapping_{mapping.name.replace(' ', '_')}.csv"

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Edit Existing Report Mapping (Live DB) — Diff + Atomic Apply
# ═══════════════════════════════════════════════════════════════════════════════


class ApplyMappingRequest(BaseModel):
    """Payload for applying mapping changes to live report_job_mapping table."""

    report_name: str
    application_name: str
    report_id: int
    nodes: list[dict]  # [{job_id, job_name}]
    edges: list[dict]  # [{source_node_id, target_node_id}]

    @field_validator("report_name", "application_name")
    @classmethod
    def validate_names(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v

    @field_validator("nodes")
    @classmethod
    def validate_nodes(cls, v: list[dict]) -> list[dict]:
        if not v:
            raise ValueError("At least one node is required")
        for n in v:
            if not n.get("job_id"):
                raise ValueError("All nodes must have a job_id assigned")
        return v


@router.post("/preview-changes")
@limiter.limit("10/minute")
def preview_mapping_changes(
    request: Request,
    payload: ApplyMappingRequest,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """
    Preview the SQL statements that would be executed to update the mapping.
    Computes diff between current DB state and new state from the editor.
    Returns the list of statements without executing them.
    """
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        statements = _compute_mapping_diff(connector, payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute diff: {str(e)[:200]}") from e

    return {
        "statements": [{"sql": s["sql"][:500], "params": s.get("params", {})} for s in statements],
        "total": len(statements),
    }


@router.post("/apply-changes")
@limiter.limit("3/minute")
def apply_mapping_changes(
    request: Request,
    payload: ApplyMappingRequest,
    user: User = Depends(require_permission("admin:report_mapping")),
    db: Session = Depends(get_db),
):
    """
    Apply mapping changes to live report_job_mapping table.
    Computes diff, executes atomically, logs to audit.
    """
    conn = find_nfc_connection(user.id, db)
    connector = get_connector(conn)

    try:
        statements = _compute_mapping_diff(connector, payload)

        if not statements:
            return {"success": True, "message": "No changes detected", "executed": 0, "skipped": 0}

        # Execute atomically
        from app.services.query_metrics import track_transaction

        result, metrics = track_transaction(connector, statements)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apply mapping failed: {e}")
        mark_connection_failed(conn, db)

        from app.models.audit import AuditLog
        from app.services.audit_chain import seal_and_persist

        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            connection_id=conn.id,
            connection_name=conn.name,
            operation="EDIT_MAPPING",
            table_name="report_job_mapping",
            row_count=0,
            query_preview=f"FAILED: {payload.report_name} / {payload.application_name}",
            status="failed",
            error_message=str(e)[:500],
        )
        seal_and_persist(audit, db)
        raise HTTPException(status_code=500, detail=f"Apply failed: {str(e)[:200]}") from e

    mark_connection_active(conn, db)

    # Audit log
    from app.models.audit import AuditLog
    from app.services.audit_chain import seal_and_persist

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        connection_id=conn.id,
        connection_name=conn.name,
        operation="EDIT_MAPPING",
        table_name="report_job_mapping",
        row_count=len(statements),
        rows_inserted=result["executed"],
        rows_skipped=result["skipped"],
        query_preview=(
            f"EDIT_MAPPING report={payload.report_name} app={payload.application_name} "
            f"statements={len(statements)} executed={result['executed']}"
        )[:500],
        status="success",
        total_time_ms=metrics.total_time_ms,
        peak_memory_bytes=metrics.peak_memory_bytes,
        cpu_time_s=metrics.cpu_time_s,
    )
    seal_and_persist(audit, db)

    return {
        "success": True,
        "report_name": payload.report_name,
        "application_name": payload.application_name,
        "total_statements": len(statements),
        "executed": result["executed"],
        "skipped": result["skipped"],
    }


def _compute_mapping_diff(connector, payload: ApplyMappingRequest) -> list[dict]:
    """
    Compute the diff between current DB state and new state.

    Strategy:
    1. Fetch current rows for this report+app
    2. Build new rows from nodes + edges
    3. Compare: what to DELETE, INSERT, UPDATE

    For job_id changes: updates previous_job_ids/next_job_ids across all rows.
    """
    # Fetch current state
    current_rows = connector.execute_query(
        """
        SELECT job_id, job_name, previous_job_ids, next_job_ids,
               run_requirement_mode, required_offsets_json, min_success_count,
               sequence_id, is_final_step, job_category
        FROM public.report_job_mapping
        WHERE report_name = :rname AND application_name = :aname
        ORDER BY job_id
        """,
        {"rname": payload.report_name, "aname": payload.application_name},
    )

    # Build current job_id set
    current_job_ids = {row["job_id"] for row in current_rows}
    current_by_job_id = {row["job_id"]: row for row in current_rows}

    # Rebuild canonical prev/next from DB's next_job_ids (single source of truth)
    # This avoids false diffs from inconsistent previous_job_ids in the DB
    db_next_map: dict[int, list[int]] = {}
    db_prev_map: dict[int, list[int]] = {}
    for row in current_rows:
        job_id = row["job_id"]
        next_str = row.get("next_job_ids") or ""
        if next_str:
            for nid_str in next_str.split(","):
                nid_str = nid_str.strip()
                if nid_str:
                    try:
                        nid = int(nid_str)
                        db_next_map.setdefault(job_id, []).append(nid)
                        db_prev_map.setdefault(nid, []).append(job_id)
                    except ValueError:
                        pass

    # Build new state from nodes + edges
    # Map node_id -> job_id
    node_to_job = {}
    for n in payload.nodes:
        node_to_job[n["id"]] = n["job_id"]

    new_job_ids = {n["job_id"] for n in payload.nodes}

    # Build adjacency from edges
    prev_map: dict[int, list[int]] = {}  # job_id -> [prev_job_ids]
    next_map: dict[int, list[int]] = {}  # job_id -> [next_job_ids]

    for edge in payload.edges:
        src_job = node_to_job.get(edge["source"])
        tgt_job = node_to_job.get(edge["target"])
        if src_job and tgt_job:
            next_map.setdefault(src_job, []).append(tgt_job)
            prev_map.setdefault(tgt_job, []).append(src_job)

    statements: list[dict] = []

    # 1. DELETE removed nodes
    removed = current_job_ids - new_job_ids
    for job_id in removed:
        statements.append(
            {
                "sql": ("DELETE FROM public.report_job_mapping " "WHERE report_id = :rid AND job_id = :jid"),
                "params": {"rid": payload.report_id, "jid": job_id},
            }
        )

    # 2. INSERT new nodes
    added = new_job_ids - current_job_ids
    for job_id in added:
        node = next((n for n in payload.nodes if n["job_id"] == job_id), None)
        if not node:
            continue
        prev_ids = ",".join(str(p) for p in sorted(prev_map.get(job_id, [])))
        next_ids = ",".join(str(n) for n in sorted(next_map.get(job_id, [])))
        statements.append(
            {
                "sql": """
                INSERT INTO public.report_job_mapping(
                    report_name, application_name, report_id, job_id, job_name,
                    previous_job_ids, next_job_ids, sequence_id, is_final_step,
                    job_category, run_requirement_mode
                ) VALUES(
                    :rname, :aname, :rid, :jid, :jname,
                    :prev, :next, 0, false,
                    '', 'PER_DATA_DATE'
                )
            """,
                "params": {
                    "rname": payload.report_name,
                    "aname": payload.application_name,
                    "rid": payload.report_id,
                    "jid": job_id,
                    "jname": node.get("job_name", ""),
                    "prev": prev_ids,
                    "next": next_ids,
                },
            }
        )

    # 3. UPDATE existing nodes where prev/next changed
    for job_id in current_job_ids & new_job_ids:
        current_row = current_by_job_id[job_id]
        new_prev = ",".join(str(p) for p in sorted(prev_map.get(job_id, [])))
        new_next = ",".join(str(n) for n in sorted(next_map.get(job_id, [])))

        # Use canonical DB state (rebuilt from edges) for comparison
        old_prev_canonical = ",".join(str(p) for p in sorted(db_prev_map.get(job_id, [])))
        old_next_canonical = ",".join(str(n) for n in sorted(db_next_map.get(job_id, [])))

        if old_prev_canonical != new_prev or old_next_canonical != new_next:
            node = next((n for n in payload.nodes if n["job_id"] == job_id), None)
            new_name = node.get("job_name", "") if node else current_row.get("job_name", "")

            statements.append(
                {
                    "sql": """
                    UPDATE public.report_job_mapping
                    SET previous_job_ids = :prev, next_job_ids = :next,
                        job_name = :jname
                    WHERE report_id = :rid AND job_id = :jid
                """,
                    "params": {
                        "prev": new_prev,
                        "next": new_next,
                        "jname": new_name,
                        "rid": payload.report_id,
                        "jid": job_id,
                    },
                }
            )

    return statements
