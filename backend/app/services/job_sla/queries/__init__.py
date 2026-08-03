"""
SQL queries for Job SLA Analyzer.

Organized by domain:
- job_queries: Job definitions and live state
- sla_queries: SLA policies and compliance
- artifact_queries: Artifact definitions and events
- proxy_queries: Proxy job inference rules
- incident_queries: SEV1 incidents and overrides
"""

from app.services.job_sla.queries.artifact_queries import (
    ARTIFACT_DEFINITIONS_BY_JOB,
    ARTIFACT_EVENT_HISTORY_BY_JOB,
    ARTIFACT_LIVE_STATE_BY_JOB,
)
from app.services.job_sla.queries.heatmap_queries import (
    DAILY_SLA_TIMELINE,
    DAY_OF_WEEK_DELAY_STATS,
    DURATION_DISTRIBUTION,
    HEATMAP_DAY_HOUR,
    MONTHLY_TREND,
    TREND_INSIGHTS,
    WEEKLY_TREND,
)
from app.services.job_sla.queries.incident_queries import (
    INCIDENT_OVERRIDES_BY_JOB,
    SEV1_INCIDENTS_BY_JOB,
)
from app.services.job_sla.queries.job_queries import (
    JOB_DEFINITION_BY_ID,
    JOB_DEFINITIONS_LIST,
    JOB_EVENT_HISTORY,
    JOB_LIVE_STATE_HISTORY,
)
from app.services.job_sla.queries.proxy_queries import (
    MCH_TASKS_BY_PROXY_EVENT,
    PROXY_RULES_FOR_JOB,
    PROXY_TRIGGERS_FOR_JOB,
)
from app.services.job_sla.queries.sla_queries import (
    SLA_COMPLIANCE_SUMMARY,
    SLA_POLICIES_BY_JOB,
)

__all__ = [
    # Job queries
    "JOB_DEFINITIONS_LIST",
    "JOB_DEFINITION_BY_ID",
    "JOB_LIVE_STATE_HISTORY",
    "JOB_EVENT_HISTORY",
    # SLA queries
    "SLA_POLICIES_BY_JOB",
    "SLA_COMPLIANCE_SUMMARY",
    # Artifact queries
    "ARTIFACT_DEFINITIONS_BY_JOB",
    "ARTIFACT_LIVE_STATE_BY_JOB",
    "ARTIFACT_EVENT_HISTORY_BY_JOB",
    # Proxy queries
    "PROXY_RULES_FOR_JOB",
    "PROXY_TRIGGERS_FOR_JOB",
    "MCH_TASKS_BY_PROXY_EVENT",
    # Incident queries
    "SEV1_INCIDENTS_BY_JOB",
    "INCIDENT_OVERRIDES_BY_JOB",
    # Heatmap queries
    "HEATMAP_DAY_HOUR",
    "WEEKLY_TREND",
    "MONTHLY_TREND",
    "DURATION_DISTRIBUTION",
    "TREND_INSIGHTS",
    "DAY_OF_WEEK_DELAY_STATS",
    "DAILY_SLA_TIMELINE",
]
