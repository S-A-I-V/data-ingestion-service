"""
Pydantic schemas for job onboarding requests.

Covers:
  - Job definition (name, owner, category, oncall, etc.)
  - SLA policies (day_of_week, expected times, timezone)
  - Proxy inference rules (proxy_job -> trigger_job)
  - Artifact definitions (expected output files)
"""

from typing import Optional

from pydantic import BaseModel, field_validator


class SLAPolicyInput(BaseModel):
    """A single SLA policy rule for a job."""

    day_of_week: str  # e.g. "Monday", "Tuesday", ... or "daily"
    schedule_frequency: str = "daily"
    expected_start_time: Optional[str] = None  # HH:MM:SS
    expected_sla_time: Optional[str] = None  # HH:MM:SS
    expected_time: Optional[str] = None  # HH:MM:SS
    timezone: str = "America/New_York"
    days_addition_start_time: int = 0
    days_addition_sla: int = 0
    expected_duration_minutes: Optional[int] = None
    data_date_formula: Optional[int] = None

    @field_validator("day_of_week")
    @classmethod
    def validate_day(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("day_of_week is required")
        return v

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("timezone is required")
        return v


class ProxyRuleInput(BaseModel):
    """A proxy inference rule: infer proxy_job status from trigger_job status."""

    trigger_job_id: int
    trigger_job_name: str
    trigger_job_status: str  # e.g. "COMPLETED"
    proxy_job_status: str  # e.g. "COMPLETED"
    proxy_completion_percentage: int = 100

    @field_validator("trigger_job_id")
    @classmethod
    def validate_trigger_id(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("trigger_job_id must be positive")
        return v

    @field_validator("trigger_job_status", "proxy_job_status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("Status cannot be empty")
        return v

    @field_validator("proxy_completion_percentage")
    @classmethod
    def validate_percentage(cls, v: int) -> int:
        if v < 0 or v > 100:
            raise ValueError("Completion percentage must be between 0 and 100")
        return v


class ArtifactDefinitionInput(BaseModel):
    """An artifact that the job is expected to produce."""

    artifact_pattern: str  # e.g. "*.csv" or "report_{date}.parquet"
    type: str = "FILE"  # FILE, DIRECTORY, etc.
    expected_count: int = 1
    completion_trigger: str = "ALL_PRESENT"
    triggers_job_status: str = "COMPLETED"
    source_type: Optional[str] = None
    job_name: Optional[str] = None  # child job name if different

    @field_validator("artifact_pattern")
    @classmethod
    def validate_pattern(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("artifact_pattern is required")
        if len(v) > 255:
            raise ValueError("artifact_pattern must be under 255 characters")
        return v

    @field_validator("expected_count")
    @classmethod
    def validate_count(cls, v: int) -> int:
        if v < 1:
            raise ValueError("expected_count must be at least 1")
        return v


class JobOnboardRequest(BaseModel):
    """Complete job onboarding payload — all steps combined for atomic insert."""

    # Job definition fields
    job_name: str
    owner_email: str
    category: str = ""
    oncall_project_name: str = ""
    oncall_contact: str = ""
    job_owner_name: str = ""
    l3_owner_name: str = ""
    l2_owner_name: str = ""
    support_team_dl: str = ""
    oncall_name: str = ""
    oncall_flag: bool = False
    job_description: str = "No description available."

    # Is this a proxy job? If yes, SLA policies come from the trigger job.
    is_proxy: bool = False

    # SLA policies (ignored if is_proxy=True — inherited from trigger)
    sla_policies: list[SLAPolicyInput] = []

    # Proxy rules (optional — only if is_proxy=True)
    proxy_rules: list[ProxyRuleInput] = []

    # Artifact definitions (optional)
    artifact_definitions: list[ArtifactDefinitionInput] = []

    @field_validator("job_name")
    @classmethod
    def validate_job_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("job_name is required")
        if len(v) > 255:
            raise ValueError("job_name must be under 255 characters")
        return v

    @field_validator("owner_email")
    @classmethod
    def validate_owner_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("owner_email is required")
        if "@" not in v:
            raise ValueError("owner_email must be a valid email")
        return v


class EditJobRequest(BaseModel):
    """Payload for editing an existing job's configuration."""

    job_id: int
    owner_email: Optional[str] = None
    category: Optional[str] = None
    oncall_project_name: Optional[str] = None
    oncall_contact: Optional[str] = None
    job_owner_name: Optional[str] = None
    l3_owner_name: Optional[str] = None
    l2_owner_name: Optional[str] = None
    support_team_dl: Optional[str] = None
    oncall_name: Optional[str] = None
    oncall_flag: Optional[bool] = None
    job_description: Optional[str] = None

    # SLA policies — full replacement if provided
    sla_policies: Optional[list[SLAPolicyInput]] = None

    # Proxy rules — full replacement if provided
    proxy_rules: Optional[list[ProxyRuleInput]] = None

    # Artifact definitions — full replacement if provided
    artifact_definitions: Optional[list[ArtifactDefinitionInput]] = None

    @field_validator("job_id")
    @classmethod
    def validate_job_id(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("job_id must be positive")
        return v
