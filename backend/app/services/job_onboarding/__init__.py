"""
Job Onboarding service layer.

Handles the full lifecycle of onboarding a new job into NFC Prod:
  1. Create job_definitions entry
  2. Create SLA policies (or inherit from trigger job if proxy)
  3. Create proxy inference rules (optional)
  4. Create artifact definitions (optional)

Modules:
  - schemas:    Pydantic request/response models
  - queries:    SQL builders & data fetchers
"""

from app.services.job_onboarding.queries import (
    build_job_edit_statements,
    build_job_onboarding_statements,
    check_job_duplicates,
    fetch_all_jobs,
    fetch_artifact_definitions_for_job,
    fetch_job_details,
    fetch_job_sla_policies,
    fetch_next_job_id,
    fetch_proxy_rules_for_job,
)
from app.services.job_onboarding.schemas import (
    ArtifactDefinitionInput,
    EditJobRequest,
    JobOnboardRequest,
    ProxyRuleInput,
    SLAPolicyInput,
)

__all__ = [
    "ArtifactDefinitionInput",
    "EditJobRequest",
    "JobOnboardRequest",
    "ProxyRuleInput",
    "SLAPolicyInput",
    "build_job_edit_statements",
    "build_job_onboarding_statements",
    "check_job_duplicates",
    "fetch_all_jobs",
    "fetch_artifact_definitions_for_job",
    "fetch_job_details",
    "fetch_job_sla_policies",
    "fetch_next_job_id",
    "fetch_proxy_rules_for_job",
]
