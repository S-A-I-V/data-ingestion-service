"""
Job SLA Analyzer — Admin-only endpoints.

Provides comprehensive SLA analysis for jobs including:
- Job listing and details
- SLA compliance metrics
- Heatmap and trend data
- Artifact tracking (for artifact jobs)
- Proxy rule analysis (for proxy jobs)
- SEV1 incident correlation

All endpoints require the 'admin:job_sla_analyzer' permission.
"""

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import limiter
from app.services.connection_status import mark_connection_active, mark_connection_failed
from app.services.job_sla import JobSlaService
from app.services.job_sla.schemas import (
    ArtifactResponse,
    ComplianceSummary,
    DurationDistributionResponse,
    EventHistoryResponse,
    HeatmapResponse,
    IncidentResponse,
    JobDefinition,
    JobListResponse,
    JobSummaryResponse,
    JobType,
    LiveStateHistoryResponse,
    ProxyResponse,
    TrendResponse,
)
from app.services.rbac import require_permission
from app.services.report_health.nfc_connection import resolve_nfc_prod_connection_with_record

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

REQUIRED_PERMISSION = "admin:job_sla_analyzer"
RATE_LIMIT_PER_MINUTE = "60/minute"
DEFAULT_DATE_RANGE_DAYS = 30

# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/admin/job-sla", tags=["admin"])


# ── Helper ────────────────────────────────────────────────────────────────────


def get_service(user: User, db: Session) -> tuple[JobSlaService, any]:
    """Resolve NFC Prod connection and return service instance."""
    try:
        connector, record = resolve_nfc_prod_connection_with_record(
            user_id=user.id,
            db=db,
        )
        return JobSlaService(connector), record
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to resolve NFC Prod connection: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Could not establish connection to NFC Prod.",
        ) from exc


# ── Job List Endpoint ─────────────────────────────────────────────────────────


@router.get("/jobs", response_model=JobListResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def list_jobs(
    request: Request,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> JobListResponse:
    """Get all active job definitions for the job selector."""
    service, record = get_service(user, db)

    try:
        # Get jobs list (fast)
        jobs = service.list_jobs(include_types=False)

        # Get all job types in batch (3 queries total instead of 3 per job)
        job_types = service.get_all_job_types()

        # Merge job types into job definitions
        for job in jobs:
            job_id = job["job_id"]
            if job_id in job_types:
                job["job_type"] = job_types[job_id]["type"]
                job["has_artifacts"] = job_types[job_id]["has_artifacts"]
                job["is_proxy"] = job_types[job_id]["is_proxy"]
                job["is_trigger"] = job_types[job_id]["is_trigger"]

        mark_connection_active(record, db)
        return JobListResponse(jobs=[JobDefinition(**j) for j in jobs])
    except Exception as exc:
        logger.error("Failed to list jobs: %s", exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch jobs.") from exc


# ── Job Summary Endpoint ──────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/summary", response_model=JobSummaryResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_job_summary(
    request: Request,
    job_id: int,
    date_from: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> JobSummaryResponse:
    """Get full summary for a job including type, compliance, and SLA policies."""
    service, record = get_service(user, db)

    try:
        job = service.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")

        job_type = service.get_job_type(job_id, job["job_name"])
        compliance = service.get_compliance_summary(job_id, date_from, date_to)
        sla_policies = service.get_sla_policies(job["job_name"])

        mark_connection_active(record, db)

        return JobSummaryResponse(
            job=JobDefinition(**job),
            job_type=JobType(**job_type),
            compliance=ComplianceSummary(**compliance) if compliance else ComplianceSummary(),
            sla_policies=sla_policies,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to get job summary for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch job summary.") from exc


# ── Live State History Endpoint ───────────────────────────────────────────────


@router.get("/jobs/{job_id}/history", response_model=LiveStateHistoryResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_live_state_history(
    request: Request,
    job_id: int,
    date_from: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> LiveStateHistoryResponse:
    """Get job live state history over a date range."""
    service, record = get_service(user, db)

    try:
        history = service.get_live_state_history(job_id, date_from, date_to)
        mark_connection_active(record, db)
        return LiveStateHistoryResponse(history=history)
    except Exception as exc:
        logger.error("Failed to get live state history for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch history.") from exc


# ── Event History Endpoint ────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/events", response_model=EventHistoryResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_event_history(
    request: Request,
    job_id: int,
    job_name: str = Query(..., description="Job name for event lookup"),
    date_from: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(default=500, le=2000, description="Max events to return"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> EventHistoryResponse:
    """Get job event history (state transitions) over a date range."""
    service, record = get_service(user, db)

    try:
        events = service.get_event_history(job_name, date_from, date_to, limit)
        mark_connection_active(record, db)
        return EventHistoryResponse(events=events)
    except Exception as exc:
        logger.error("Failed to get event history for job=%s: %s", job_name, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch events.") from exc


# ── Heatmap Endpoint ──────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/heatmap", response_model=HeatmapResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_heatmap(
    request: Request,
    job_id: int,
    date_from: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> HeatmapResponse:
    """Get day-of-week × hour heatmap data."""
    service, record = get_service(user, db)

    try:
        cells = service.get_heatmap_data(job_id, date_from, date_to)
        mark_connection_active(record, db)
        return HeatmapResponse(cells=cells)
    except Exception as exc:
        logger.error("Failed to get heatmap for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch heatmap.") from exc


# ── Trend Endpoint ────────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/trends", response_model=TrendResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_trends(
    request: Request,
    job_id: int,
    date_from: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    include_insights: bool = Query(default=True, description="Include trend insights comparison"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> TrendResponse:
    """Get weekly and monthly trend data with optional insights."""
    service, record = get_service(user, db)

    try:
        weekly = service.get_weekly_trend(job_id, date_from, date_to)
        monthly = service.get_monthly_trend(job_id, date_from, date_to)
        sla_timeline = service.get_sla_timeline(job_id, date_from, date_to)

        insights = None
        day_of_week_stats = None
        if include_insights:
            insights_data = service.get_trend_insights(job_id, date_from, date_to)
            if insights_data:
                insights = insights_data
            day_of_week_stats = service.get_day_of_week_stats(job_id, date_from, date_to)

        mark_connection_active(record, db)
        return TrendResponse(
            weekly=weekly,
            monthly=monthly,
            sla_timeline=sla_timeline if sla_timeline else None,
            insights=insights,
            day_of_week_stats=day_of_week_stats,
        )
    except Exception as exc:
        logger.error("Failed to get trends for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch trends.") from exc


# ── Duration Distribution Endpoint ────────────────────────────────────────────


@router.get("/jobs/{job_id}/duration-distribution", response_model=DurationDistributionResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_duration_distribution(
    request: Request,
    job_id: int,
    date_from: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    bucket_size: int = Query(default=5, ge=1, le=60, description="Bucket size in minutes"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> DurationDistributionResponse:
    """Get duration distribution for histogram visualization."""
    service, record = get_service(user, db)

    try:
        buckets = service.get_duration_distribution(job_id, date_from, date_to, bucket_size)
        mark_connection_active(record, db)
        return DurationDistributionResponse(buckets=buckets)
    except Exception as exc:
        logger.error("Failed to get duration distribution for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch distribution.") from exc


# ── Artifact Endpoints ────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/artifacts", response_model=ArtifactResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_artifacts(
    request: Request,
    job_id: int,
    job_name: str = Query(..., description="Job name for artifact event lookup"),
    date_from: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(default=500, le=2000, description="Max events to return"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> ArtifactResponse:
    """Get artifact definitions, live state, and events for a job."""
    service, record = get_service(user, db)

    try:
        definitions = service.get_artifact_definitions(job_id)
        live_state = service.get_artifact_live_state(job_id, date_from, date_to)
        events = service.get_artifact_event_history(job_name, date_from, date_to, limit)
        mark_connection_active(record, db)
        return ArtifactResponse(
            definitions=definitions,
            live_state=live_state,
            events=events,
        )
    except Exception as exc:
        logger.error("Failed to get artifacts for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch artifacts.") from exc


# ── Proxy Endpoints ───────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/proxy", response_model=ProxyResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_proxy_rules(
    request: Request,
    job_id: int,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> ProxyResponse:
    """Get proxy inference rules where this job is proxy or trigger."""
    service, record = get_service(user, db)

    try:
        proxy_rules = service.get_proxy_rules(job_id)
        trigger_rules = service.get_trigger_rules(job_id)
        mark_connection_active(record, db)
        return ProxyResponse(
            proxy_rules=proxy_rules,
            trigger_rules=trigger_rules,
        )
    except Exception as exc:
        logger.error("Failed to get proxy rules for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch proxy rules.") from exc


# ── Incident Endpoints ────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/incidents", response_model=IncidentResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_incidents(
    request: Request,
    job_id: int,
    job_name: str = Query(..., description="Job name for incident lookup"),
    date_from: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> IncidentResponse:
    """Get SEV1 incidents and overrides for a job."""
    service, record = get_service(user, db)

    try:
        sev1_incidents = service.get_sev1_incidents(job_name, date_from, date_to)
        overrides = service.get_incident_overrides(job_name, date_from, date_to)
        mark_connection_active(record, db)
        return IncidentResponse(
            sev1_incidents=sev1_incidents,
            overrides=overrides,
        )
    except Exception as exc:
        logger.error("Failed to get incidents for job=%s: %s", job_name, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch incidents.") from exc
