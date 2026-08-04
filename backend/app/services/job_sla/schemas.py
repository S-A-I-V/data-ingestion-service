"""
Pydantic response schemas for Job SLA Analyzer API.

Organized by concern:
- Job models
- SLA models
- Artifact models
- Proxy models
- Incident models
- Heatmap/Trend models
"""

from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, Field

# ── Job Models ────────────────────────────────────────────────────────────────


class JobDefinition(BaseModel):
    """Job definition from job_definitions table."""

    job_id: int
    job_name: str
    owner_email: Optional[str] = None
    oncall_project_name: Optional[str] = None
    oncall_contact: Optional[str] = None
    job_owner_name: Optional[str] = None
    l3_owner_name: Optional[str] = None
    l2_owner_name: Optional[str] = None
    support_team_dl: Optional[str] = None
    oncall_name: Optional[str] = None
    oncall_flag: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Job type info (populated when include_types=True in list_jobs)
    job_type: Optional[str] = None  # standard, artifact, proxy, artifact_proxy
    has_artifacts: Optional[bool] = None
    is_proxy: Optional[bool] = None
    is_trigger: Optional[bool] = None


class JobType(BaseModel):
    """Job type classification."""

    type: str = Field(description="standard, artifact, proxy, or artifact_proxy")
    has_artifacts: bool
    is_proxy: bool
    is_trigger: bool
    artifact_count: int
    proxy_rule_count: int
    trigger_rule_count: int


class JobLiveState(BaseModel):
    """Job live state record."""

    job_id: int
    job_name: str
    data_date: date
    client_name: Optional[str] = None
    current_status: Optional[str] = None
    completion_percentage: Optional[int] = None
    delay_status: Optional[str] = None
    delay_duration_minutes: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    jeet_threshold: Optional[datetime] = None
    reet_threshold: Optional[datetime] = None
    expected_start_time: Optional[datetime] = None
    job_expected_sla: Optional[datetime] = None
    projected_end_time: Optional[datetime] = None
    expected_duration_minutes: Optional[int] = None
    observed_duration_seconds: Optional[int] = None
    run_id: Optional[str] = None
    job_url: Optional[str] = None
    orchestrator_name: Optional[str] = None
    message_source: Optional[str] = None
    reissue_version: Optional[str] = None
    sev1_numbers: Optional[str] = None
    sev1_urls: Optional[str] = None
    job_delay_reason: Optional[str] = None


class JobEvent(BaseModel):
    """Job event from event history."""

    event_id: str
    job_name: str
    data_date: date
    status: Optional[str] = None
    source: Optional[str] = None
    event_timestamp: Optional[datetime] = None
    job_start_timestamp: Optional[datetime] = None
    completion_percent: Optional[int] = None
    run_id: Optional[str] = None
    job_url: Optional[str] = None
    reissue_version: Optional[str] = None
    orchestrator_name: Optional[str] = None
    client_name: Optional[str] = None
    created_at: Optional[datetime] = None


# ── SLA Models ────────────────────────────────────────────────────────────────


class SlaPolicy(BaseModel):
    """SLA policy for a job."""

    policy_id: str
    entity_name: str
    entity_type: str
    application_name: Optional[str] = None
    day_of_week: Optional[str] = None
    expected_time: Optional[time] = None
    expected_start_time: Optional[time] = None
    expected_sla_time: Optional[time] = None
    timezone: Optional[str] = None
    days_addition_start_time: Optional[int] = None
    days_addition_sla: Optional[int] = None
    expected_duration_minutes: Optional[int] = None
    schedule_frequency: Optional[str] = None
    data_date_formula: Optional[int] = None
    created_at: Optional[datetime] = None


class ComplianceSummary(BaseModel):
    """SLA compliance summary metrics."""

    total_runs: int = 0
    on_time_count: int = 0
    late_count: int = 0
    delayed_count: int = 0
    failed_count: int = 0
    running_count: int = 0
    on_time_percentage: Optional[float] = None
    avg_delay_minutes: Optional[float] = None
    max_delay_minutes: Optional[float] = None


# ── Artifact Models ───────────────────────────────────────────────────────────


class ArtifactDefinition(BaseModel):
    """Artifact definition for a job."""

    definition_id: str
    parent_job_name: Optional[str] = None
    parent_job_id: Optional[int] = None
    job_name: Optional[str] = None
    artifact_pattern: Optional[str] = None
    type: Optional[str] = None
    expected_count: Optional[int] = None
    completion_trigger: Optional[str] = None
    triggers_job_status: Optional[str] = None
    source_type: Optional[str] = None


class ArtifactLiveState(BaseModel):
    """Artifact live state record."""

    artifact_id: str
    parent_job_name: Optional[str] = None
    parent_job_id: Optional[int] = None
    data_date: date
    actual_filename: Optional[str] = None
    status: Optional[str] = None
    timestamp: Optional[datetime] = None
    source_type: Optional[str] = None
    identifier: Optional[str] = None
    release_status: Optional[str] = None
    release_type: Optional[str] = None
    received_time: Optional[datetime] = None
    release_time: Optional[datetime] = None
    completion_percent: Optional[int] = None
    scheduled_release_time: Optional[datetime] = None
    observed_duration_seconds: Optional[int] = None
    created_at: Optional[datetime] = None


class ArtifactEvent(BaseModel):
    """Artifact event from event history."""

    event_id: str
    source_type: Optional[str] = None
    parent_job_name: Optional[str] = None
    data_date: date
    identifier: Optional[str] = None
    file_name: Optional[str] = None
    status: Optional[str] = None
    completion_percent: Optional[int] = None
    event_timestamp: Optional[datetime] = None
    received_time: Optional[datetime] = None
    release_time: Optional[datetime] = None
    scheduled_release_time: Optional[datetime] = None
    release_type: Optional[str] = None
    report_name: Optional[str] = None
    delivery_date: Optional[date] = None
    client_name: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Proxy Models ──────────────────────────────────────────────────────────────


class ProxyRule(BaseModel):
    """Proxy inference rule."""

    id: str
    proxy_job_id: int
    proxy_job_name: str
    proxy_job_status: str
    proxy_completion_percentage: Optional[int] = None
    trigger_job_id: int
    trigger_job_name: str
    trigger_job_status: str
    is_enabled: bool
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Incident Models ───────────────────────────────────────────────────────────


class Sev1Incident(BaseModel):
    """SEV1 incident record."""

    incident_id: str
    job_name: str
    data_date: date
    sev1_number: Optional[str] = None
    sev1_url: Optional[str] = None
    gspace_url: Optional[str] = None
    projected_end_time: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None


class IncidentOverride(BaseModel):
    """Incident override record."""

    override_id: str
    job_name: str
    data_date: date
    proposed_end_time: Optional[datetime] = None
    ticket_url: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None


# ── Heatmap/Trend Models ──────────────────────────────────────────────────────


class HeatmapCell(BaseModel):
    """Single cell in day-of-week × hour heatmap."""

    day_of_week: int = Field(description="0=Sunday, 1=Monday, ..., 6=Saturday")
    hour_of_day: int = Field(ge=0, le=23)
    run_count: int
    delayed_count: int
    on_time_count: int
    late_count: int
    failed_count: int
    avg_duration_minutes: Optional[float] = None


class DurationBucket(BaseModel):
    """Duration distribution bucket for histogram."""

    bucket_start: float
    count: int


class TrendInsightsPeriod(BaseModel):
    """Period data for trend insights."""

    date_from: str
    date_to: str
    total_runs: int
    on_time_count: int
    late_count: int
    failed_count: int
    avg_duration_minutes: Optional[float] = None
    p95_duration_minutes: Optional[float] = None
    on_time_percentage: Optional[float] = None


class TrendInsights(BaseModel):
    """Trend insights comparing current and previous periods."""

    current_period: TrendInsightsPeriod
    previous_period: TrendInsightsPeriod
    worst_day_of_week: Optional[int] = None
    worst_day_late_percentage: Optional[float] = None
    duration_trend_percentage: Optional[float] = None
    duration_trend_direction: Optional[str] = None  # "faster" or "slower"
    on_time_trend_change: Optional[float] = None
    on_time_trend_direction: Optional[str] = None  # "improving" or "declining"


class DayOfWeekStats(BaseModel):
    """Delay statistics for a specific day of week."""

    day_of_week: int  # 0=Sunday, 6=Saturday
    total_runs: int
    late_count: int
    failed_count: int
    late_percentage: Optional[float] = None
    avg_duration_minutes: Optional[float] = None


class SlaTimelinePoint(BaseModel):
    """Single point in the SLA deviation timeline chart."""

    data_date: date
    expected_sla_minutes: Optional[float] = None  # Minutes from midnight
    actual_end_minutes: Optional[float] = None  # Minutes from midnight
    deviation_minutes: Optional[float] = None  # Positive = late, negative = early
    current_status: Optional[str] = None
    delay_status: Optional[str] = None
    delay_duration_minutes: Optional[int] = None


class CalendarDay(BaseModel):
    """Single day in the 90-day calendar view."""

    data_date: date
    status: str  # on_time | late | failed | running | unknown
    total_runs: int
    on_time_count: int
    late_count: int
    failed_count: int
    delayed_count: int
    max_overrun_minutes: Optional[float] = None


class CalendarResponse(BaseModel):
    """Response for calendar endpoint."""

    days: list[CalendarDay]


# ── Response Models ───────────────────────────────────────────────────────────


class JobListResponse(BaseModel):
    """Response for job list endpoint."""

    jobs: list[JobDefinition]


class JobSummaryResponse(BaseModel):
    """Full summary response for a job."""

    job: JobDefinition
    job_type: JobType
    compliance: ComplianceSummary
    sla_policies: list[SlaPolicy]


class LiveStateHistoryResponse(BaseModel):
    """Response for live state history endpoint."""

    history: list[JobLiveState]


class EventHistoryResponse(BaseModel):
    """Response for event history endpoint."""

    events: list[JobEvent]


class HeatmapResponse(BaseModel):
    """Response for heatmap endpoint."""

    cells: list[HeatmapCell]


class DayOfWeekSlaBars(BaseModel):
    """Per-day-of-week SLA expected vs actual bar data."""

    day_of_week: int = Field(description="0=Sunday … 6=Saturday (PostgreSQL DOW)")
    total_runs: int
    occurrence_count: Optional[int] = None
    most_recent_date: Optional[date] = None
    breach_count: int
    on_time_count: int
    failed_count: int
    expected_start_minutes: Optional[float] = None  # avg expected start time (mins from midnight)
    actual_start_minutes: Optional[float] = None  # avg actual start time (mins from midnight)
    expected_sla_minutes: Optional[float] = None  # avg expected SLA end time (mins from midnight)
    actual_end_minutes: Optional[float] = None  # avg actual end time (mins from midnight)
    avg_delay_minutes: Optional[float] = None
    on_time_percentage: Optional[float] = None


class WeeklySlaBars(BaseModel):
    """Per-day SLA bar data for the daily timeline view (formerly 'weekly' grouping)."""

    data_date: date
    current_status: Optional[str] = None
    breach_count: int = 0
    on_time_count: int = 0
    failed_count: int = 0
    expected_start_minutes: Optional[float] = None
    actual_start_minutes: Optional[float] = None
    expected_sla_minutes: Optional[float] = None
    actual_end_minutes: Optional[float] = None
    avg_delay_minutes: Optional[float] = None
    on_time_percentage: Optional[float] = None


class TrendResponse(BaseModel):
    """Response for trend endpoint."""

    sla_timeline: Optional[list[SlaTimelinePoint]] = None
    insights: Optional[TrendInsights] = None
    day_of_week_stats: Optional[list[DayOfWeekStats]] = None
    day_of_week_sla_bars: Optional[list[DayOfWeekSlaBars]] = None
    weekly_sla_bars: Optional[list[WeeklySlaBars]] = None


class DurationDistributionResponse(BaseModel):
    """Response for duration distribution endpoint."""

    buckets: list[DurationBucket]


class ArtifactResponse(BaseModel):
    """Response for artifact endpoints."""

    definitions: list[ArtifactDefinition]
    live_state: list[ArtifactLiveState]
    events: list[ArtifactEvent]


class ProxyResponse(BaseModel):
    """Response for proxy endpoints."""

    proxy_rules: list[ProxyRule]
    trigger_rules: list[ProxyRule]


class IncidentResponse(BaseModel):
    """Response for incident endpoints."""

    sev1_incidents: list[Sev1Incident]
    overrides: list[IncidentOverride]
