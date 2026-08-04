"""
Job SLA Analyzer — Admin-only endpoints.

All historical data covers a fixed 90-day rolling window computed server-side.
No date range parameters are accepted.

All endpoints require the 'admin:job_sla_analyzer' permission.
"""

import logging

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
    DayOfWeekSlaBars,
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
    WeeklySlaBars,
)
from app.services.rbac import require_permission
from app.services.report_health.nfc_connection import resolve_nfc_prod_connection_with_record

logger = logging.getLogger(__name__)

REQUIRED_PERMISSION = "admin:job_sla_analyzer"
RATE_LIMIT_PER_MINUTE = "60/minute"

router = APIRouter(prefix="/api/admin/job-sla", tags=["admin"])


def get_service(user: User, db: Session) -> tuple[JobSlaService, any]:
    """Resolve NFC Prod connection and return a service instance."""
    try:
        connector, record = resolve_nfc_prod_connection_with_record(user_id=user.id, db=db)
        return JobSlaService(connector), record
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to resolve NFC Prod connection: %s", exc)
        raise HTTPException(status_code=503, detail="Could not establish connection to NFC Prod.") from exc


# ── Job List ──────────────────────────────────────────────────────────────────


@router.get("/jobs", response_model=JobListResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def list_jobs(
    request: Request,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> JobListResponse:
    """Return all active job definitions with type metadata."""
    service, record = get_service(user, db)
    try:
        jobs = service.list_jobs(include_types=False)
        job_types = service.get_all_job_types()
        for job in jobs:
            jid = job["job_id"]
            if jid in job_types:
                job["job_type"] = job_types[jid]["type"]
                job["has_artifacts"] = job_types[jid]["has_artifacts"]
                job["is_proxy"] = job_types[jid]["is_proxy"]
                job["is_trigger"] = job_types[jid]["is_trigger"]
        mark_connection_active(record, db)
        return JobListResponse(jobs=[JobDefinition(**j) for j in jobs])
    except Exception as exc:
        logger.error("Failed to list jobs: %s", exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch jobs.") from exc


# ── Job Summary ───────────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/summary", response_model=JobSummaryResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_job_summary(
    request: Request,
    job_id: int,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> JobSummaryResponse:
    """Return job type, 90-day compliance summary, and SLA policies."""
    service, record = get_service(user, db)
    try:
        job = service.get_job_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
        job_type = service.get_job_type(job_id, job["job_name"])
        compliance = service.get_compliance_summary(job_id)
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


# ── Live State History ────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/history", response_model=LiveStateHistoryResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_live_state_history(
    request: Request,
    job_id: int,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> LiveStateHistoryResponse:
    """Return job live state history for the last 90 days."""
    service, record = get_service(user, db)
    try:
        history = service.get_live_state_history(job_id)
        mark_connection_active(record, db)
        return LiveStateHistoryResponse(history=history)
    except Exception as exc:
        logger.error("Failed to get live state history for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch history.") from exc


# ── Event History ─────────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/events", response_model=EventHistoryResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_event_history(
    request: Request,
    job_id: int,
    job_name: str = Query(..., description="Job name for event lookup"),
    limit: int = Query(default=500, le=2000, description="Max events to return"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> EventHistoryResponse:
    """Return job event history for the last 90 days."""
    service, record = get_service(user, db)
    try:
        events = service.get_event_history(job_name, limit)
        mark_connection_active(record, db)
        return EventHistoryResponse(events=events)
    except Exception as exc:
        logger.error("Failed to get event history for job=%s: %s", job_name, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch events.") from exc


# ── Heatmap ───────────────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/heatmap", response_model=HeatmapResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_heatmap(
    request: Request,
    job_id: int,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> HeatmapResponse:
    """Return day-of-week × hour heatmap for the last 90 days."""
    service, record = get_service(user, db)
    try:
        cells = service.get_heatmap_data(job_id)
        mark_connection_active(record, db)
        return HeatmapResponse(cells=cells)
    except Exception as exc:
        logger.error("Failed to get heatmap for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch heatmap.") from exc


# ── Trends ────────────────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/trends", response_model=TrendResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_trends(
    request: Request,
    job_id: int,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> TrendResponse:
    """Return weekly/monthly trends and insights for the last 90 days."""
    service, record = get_service(user, db)
    try:
        sla_timeline = service.get_sla_timeline(job_id)
        insights = service.get_trend_insights(job_id)
        day_of_week_stats = service.get_day_of_week_stats(job_id)
        day_of_week_sla_bars = service.get_day_of_week_sla_bars(job_id)
        weekly_sla_bars = service.get_weekly_sla_bars(job_id)
        mark_connection_active(record, db)
        return TrendResponse(
            sla_timeline=sla_timeline if sla_timeline else None,
            insights=insights,
            day_of_week_stats=day_of_week_stats,
            day_of_week_sla_bars=[DayOfWeekSlaBars(**r) for r in day_of_week_sla_bars],
            weekly_sla_bars=[WeeklySlaBars(**r) for r in weekly_sla_bars],
        )
    except Exception as exc:
        logger.error("Failed to get trends for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch trends.") from exc


# ── Duration Distribution ─────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/duration-distribution", response_model=DurationDistributionResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_duration_distribution(
    request: Request,
    job_id: int,
    bucket_size: int = Query(default=5, ge=1, le=60, description="Bucket size in minutes"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> DurationDistributionResponse:
    """Return duration histogram for the last 90 days."""
    service, record = get_service(user, db)
    try:
        buckets = service.get_duration_distribution(job_id, bucket_size)
        mark_connection_active(record, db)
        return DurationDistributionResponse(buckets=buckets)
    except Exception as exc:
        logger.error("Failed to get duration distribution for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch distribution.") from exc


# ── Artifacts ─────────────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/artifacts", response_model=ArtifactResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_artifacts(
    request: Request,
    job_id: int,
    job_name: str = Query(..., description="Job name for artifact event lookup"),
    limit: int = Query(default=500, le=2000, description="Max events to return"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> ArtifactResponse:
    """Return artifact definitions, live state, and events for the last 90 days."""
    service, record = get_service(user, db)
    try:
        definitions = service.get_artifact_definitions(job_id)
        live_state = service.get_artifact_live_state(job_id)
        events = service.get_artifact_event_history(job_name, limit)
        mark_connection_active(record, db)
        return ArtifactResponse(definitions=definitions, live_state=live_state, events=events)
    except Exception as exc:
        logger.error("Failed to get artifacts for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch artifacts.") from exc


# ── Proxy Rules ───────────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/proxy", response_model=ProxyResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_proxy_rules(
    request: Request,
    job_id: int,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> ProxyResponse:
    """Return proxy inference rules for this job."""
    service, record = get_service(user, db)
    try:
        proxy_rules = service.get_proxy_rules(job_id)
        trigger_rules = service.get_trigger_rules(job_id)
        mark_connection_active(record, db)
        return ProxyResponse(proxy_rules=proxy_rules, trigger_rules=trigger_rules)
    except Exception as exc:
        logger.error("Failed to get proxy rules for job_id=%s: %s", job_id, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch proxy rules.") from exc


# ── Incidents ─────────────────────────────────────────────────────────────────


@router.get("/jobs/{job_id}/incidents", response_model=IncidentResponse)
@limiter.limit(RATE_LIMIT_PER_MINUTE)
def get_incidents(
    request: Request,
    job_id: int,
    job_name: str = Query(..., description="Job name for incident lookup"),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
) -> IncidentResponse:
    """Return SEV1 incidents and overrides for the last 90 days."""
    service, record = get_service(user, db)
    try:
        sev1_incidents = service.get_sev1_incidents(job_name)
        overrides = service.get_incident_overrides(job_name)
        mark_connection_active(record, db)
        return IncidentResponse(sev1_incidents=sev1_incidents, overrides=overrides)
    except Exception as exc:
        logger.error("Failed to get incidents for job=%s: %s", job_name, exc)
        mark_connection_failed(record, db)
        raise HTTPException(status_code=500, detail="Failed to fetch incidents.") from exc
