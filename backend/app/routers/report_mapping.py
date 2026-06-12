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
            SELECT job_id, job_name, category, owner_email, job_description,
                   is_deleted
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
