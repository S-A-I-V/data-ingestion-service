# ruff: noqa: UP006, UP035
"""
Pydantic response models for the Report Health Dashboard.

These models mirror the TypeScript types in frontend/src/types/reportHealth.ts.
Field names and optionality are kept in sync deliberately.

nfc_prod table sources per field group:
  RunStatusItem            <- job_live_state (per data_date row)
  ReportJobResponse        <- job_live_state JOIN job_definitions JOIN report_job_mapping
  ReportLiveStateResponse  <- report_live_state
  ReportHealthPayload      <- assembled composite of all the above
"""

from datetime import date, datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class RunStatusItem(BaseModel):
    """Per-data-date run status for a single job within a coverage window."""

    data_date: date
    status: str
    delay_status: str
    completion_percentage: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    client_name: str = ""


class ReportJobResponse(BaseModel):
    """
    Full job state record for one job within a report's pipeline.

    Sources:
      - Runtime state:   job_live_state (job_id, data_date, client_name PK)
      - Static metadata: job_definitions (job_id PK)
      - DAG wiring:      report_job_mapping (report_id, job_id PK)
      - SLA thresholds:  sla_policies (entity_name = job_name, entity_type = 'job')
      - Incidents:       sev1_incidents (job_name, data_date)
    """

    # Identity
    job_id: int
    job_name: str
    sequence_id: Optional[int] = None
    job_category: Optional[str] = None
    is_final_step: bool = False

    # Live status (from job_live_state)
    current_status: str
    job_status: str  # alias for current_status — frontend compat
    completion_percentage: int
    job_completion_percentage: int  # alias
    delay_status: str
    delay_duration_minutes: int = 0
    job_running_status: str  # alias for delay_status
    job_state: str  # alias for delay_status

    # Timing (from job_live_state)
    start_time: Optional[datetime] = None
    job_start_timestamp: Optional[datetime] = None  # alias for start_time
    end_time: Optional[datetime] = None
    job_end_timestamp: Optional[datetime] = None  # alias for end_time
    expected_start_time: Optional[datetime] = None
    job_expected_sla: Optional[datetime] = None
    projected_end_time: Optional[datetime] = None
    last_updated_time: Optional[datetime] = None

    # Incidents (from sev1_incidents)
    sev1_numbers: Optional[str] = None
    sev1_urls: Optional[str] = None
    sev1_number: Optional[str] = None  # alias: first entry
    sev1_url: Optional[str] = None  # alias: first entry
    gspace_url: Optional[str] = None

    # DAG wiring (from report_job_mapping)
    next_jobs_list: str = ""
    previous_jobs_list: str = ""

    # Ownership (from job_definitions)
    job_owner_name: Optional[str] = None
    oncall_name: Optional[str] = None
    L3_owner_name: Optional[str] = None
    L2_owner_name: Optional[str] = None
    support_team_DL: Optional[str] = None

    # Orchestration (from job_live_state)
    run_id: Optional[str] = None
    job_url: Optional[str] = None
    orchestrator_name: Optional[str] = None
    message_source: Optional[str] = None

    # Context
    data_date: date
    job_description: Optional[str] = None
    run_requirement_mode: str = "PER_DATA_DATE"

    # Run requirement summary (computed by assembler)
    required_runs: int = 0
    completed_required_runs: int = 0
    running_required_runs: int = 0
    delayed_required_runs: int = 0
    covered_data_dates: List[date] = Field(default_factory=list)
    run_statuses: List[RunStatusItem] = Field(default_factory=list)


class ReportLiveStateResponse(BaseModel):
    """
    Report-level delivery state.
    Source: report_live_state (report_id, data_date, delivery_date, client_name PK)
    """

    report_id: int
    report_name: str
    application_name: str
    data_date: date
    coverage_start_date: Optional[date] = None
    coverage_end_date: Optional[date] = None
    delivery_date: date
    client_name: str = ""

    # Delivery state
    report_delivery_status: str
    report_delay_status: str
    report_delay_duration_minutes: int = 0

    # Step counts
    total_no_of_steps: int = 0
    no_of_completed_steps: int = 0
    no_of_running_steps: int = 0
    no_of_delayed_steps: int = 0

    # SLA
    bam_sla: Optional[datetime] = None
    report_start_time: Optional[datetime] = None
    report_end_time: Optional[datetime] = None

    # Incidents
    sev1_numbers: Optional[str] = None
    sev1_urls: Optional[str] = None

    # Delayed job attribution (comma-separated names from report_live_state.delayed_job_name)
    delayed_job_name: Optional[str] = None

    report_metadata: Optional[Any] = None
    workflow_coordinates: Optional[Any] = None


class ReportHealthPayload(BaseModel):
    """
    Top-level payload returned per report entry.
    Mirrors frontend ReportHealthPayload type.
    """

    report: ReportLiveStateResponse
    jobs: List[ReportJobResponse] = Field(default_factory=list)
    coverage_start_date: date
    coverage_end_date: date
    covered_data_dates: List[date] = Field(default_factory=list)


class ReportHealthSummary(BaseModel):
    """Summary counts for the status strip — computed server-side."""

    total: int = 0
    in_progress: int = 0
    client_delayed: int = 0
    internal_delayed: int = 0
    completed: int = 0


class ReportHealthListResponse(BaseModel):
    """
    Wrapper response for the report health list endpoint.
    Contains reports + pre-computed summary counts.
    """

    reports: List[ReportHealthPayload] = Field(default_factory=list)
    summary: ReportHealthSummary = Field(default_factory=ReportHealthSummary)
