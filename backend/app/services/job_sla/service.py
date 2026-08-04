"""
Job SLA Analyzer service — orchestrates queries and assembles results.

All historical queries operate over a fixed 90-day rolling window that is
computed inside the SQL itself (CURRENT_DATE - 89 days → CURRENT_DATE).
No date parameters are accepted or forwarded by this service.

Error handling convention:
- Methods that return data for display (charts, tables) catch exceptions,
  log them, and return a safe empty default so the UI degrades gracefully.
- Methods called during the critical summary path (get_job_by_id,
  get_compliance_summary) re-raise so the router can return a 500 with
  a clear error message rather than silently returning incomplete data.
"""

import logging
from datetime import date, timedelta
from typing import Any, Optional

from app.services.job_sla.queries import (
    ARTIFACT_DEFINITIONS_BY_JOB,
    ARTIFACT_EVENT_HISTORY_BY_JOB,
    ARTIFACT_LIVE_STATE_BY_JOB,
    DAILY_SLA_TIMELINE,
    DAY_OF_WEEK_DELAY_STATS,
    DAY_OF_WEEK_SLA_BARS,
    DURATION_DISTRIBUTION,
    HEATMAP_DAY_HOUR,
    INCIDENT_OVERRIDES_BY_JOB,
    JOB_DEFINITION_BY_ID,
    JOB_DEFINITIONS_LIST,
    JOB_EVENT_HISTORY,
    JOB_LIVE_STATE_HISTORY,
    PROXY_RULES_FOR_JOB,
    PROXY_TRIGGERS_FOR_JOB,
    SEV1_INCIDENTS_BY_JOB,
    SLA_COMPLIANCE_SUMMARY,
    SLA_POLICIES_BY_JOB,
    TREND_INSIGHTS,
    WEEKLY_SLA_BARS,
)

logger = logging.getLogger(__name__)

DEFAULT_EVENT_HISTORY_LIMIT = 500
DEFAULT_DURATION_BUCKET_MINUTES = 5


class JobSlaService:
    """Service class for Job SLA analysis operations."""

    def __init__(self, connector: Any):
        self.connector = connector

    # ── Job Listing ───────────────────────────────────────────────────────────

    def list_jobs(self, include_types: bool = False) -> list[dict]:
        """Get all active job definitions."""
        try:
            rows = self.connector.execute_query(JOB_DEFINITIONS_LIST)
        except Exception as exc:
            logger.error("list_jobs query failed: %s", exc)
            raise

        jobs = [dict(row) for row in rows]

        if include_types:
            for job in jobs:
                jt = self.get_job_type(job["job_id"], job["job_name"])
                job["job_type"] = jt["type"]
                job["has_artifacts"] = jt["has_artifacts"]
                job["is_proxy"] = jt["is_proxy"]
                job["is_trigger"] = jt["is_trigger"]

        return jobs

    def get_all_job_types(self) -> dict[int, dict]:
        """Batch-fetch job types for all jobs (3 queries total)."""
        try:
            artifact_job_ids = {
                row["parent_job_id"]
                for row in self.connector.execute_query(
                    "SELECT DISTINCT parent_job_id FROM artifact_definitions WHERE parent_job_id IS NOT NULL"
                )
            }
            proxy_job_ids = {
                row["proxy_job_id"]
                for row in self.connector.execute_query(
                    "SELECT DISTINCT proxy_job_id FROM job_proxy_inference_rules WHERE is_enabled = true"
                )
            }
            trigger_job_ids = {
                row["trigger_job_id"]
                for row in self.connector.execute_query(
                    "SELECT DISTINCT trigger_job_id FROM job_proxy_inference_rules WHERE is_enabled = true"
                )
            }
            all_jobs = self.connector.execute_query("SELECT job_id FROM job_definitions WHERE is_deleted IS NOT TRUE")
        except Exception as exc:
            logger.error("get_all_job_types query failed: %s", exc)
            raise

        result = {}
        for row in all_jobs:
            job_id = row["job_id"]
            has_artifacts = job_id in artifact_job_ids
            is_proxy = job_id in proxy_job_ids
            is_trigger = job_id in trigger_job_ids

            if has_artifacts and is_proxy:
                job_type = "artifact_proxy"
            elif has_artifacts:
                job_type = "artifact"
            elif is_proxy:
                job_type = "proxy"
            else:
                job_type = "standard"

            result[job_id] = {
                "type": job_type,
                "has_artifacts": has_artifacts,
                "is_proxy": is_proxy,
                "is_trigger": is_trigger,
            }

        return result

    def get_job_by_id(self, job_id: int) -> Optional[dict]:
        """Get a single job definition by ID. Re-raises on DB error."""
        try:
            rows = self.connector.execute_query(JOB_DEFINITION_BY_ID, {"job_id": job_id})
            return dict(rows[0]) if rows else None
        except Exception as exc:
            logger.error("get_job_by_id failed for job_id=%s: %s", job_id, exc)
            raise

    # ── Job Type Detection ────────────────────────────────────────────────────

    def get_job_type(self, job_id: int, job_name: str) -> dict:  # noqa: ARG002
        """Detect job type: standard | artifact | proxy | artifact_proxy."""
        try:
            artifact_defs = self.connector.execute_query(ARTIFACT_DEFINITIONS_BY_JOB, {"job_id": job_id})
            proxy_rules = self.connector.execute_query(PROXY_RULES_FOR_JOB, {"job_id": job_id})
            trigger_rules = self.connector.execute_query(PROXY_TRIGGERS_FOR_JOB, {"job_id": job_id})
        except Exception as exc:
            logger.error("get_job_type failed for job_id=%s: %s", job_id, exc)
            raise

        has_artifacts = len(artifact_defs) > 0
        is_proxy = len(proxy_rules) > 0
        is_trigger = len(trigger_rules) > 0

        if has_artifacts and is_proxy:
            job_type = "artifact_proxy"
        elif has_artifacts:
            job_type = "artifact"
        elif is_proxy:
            job_type = "proxy"
        else:
            job_type = "standard"

        return {
            "type": job_type,
            "has_artifacts": has_artifacts,
            "is_proxy": is_proxy,
            "is_trigger": is_trigger,
            "artifact_count": len(artifact_defs),
            "proxy_rule_count": len(proxy_rules),
            "trigger_rule_count": len(trigger_rules),
        }

    # ── SLA Policies & Compliance ─────────────────────────────────────────────

    def get_sla_policies(self, job_name: str) -> list[dict]:
        """
        Fetch SLA policies for a job directly from the sla_policies table.
        Returns [] if no policy exists or on error — callers treat empty as
        "no SLA configured" and show a graceful message.
        """
        try:
            rows = self.connector.execute_query(SLA_POLICIES_BY_JOB, {"job_name": job_name})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_sla_policies failed for job=%s: %s", job_name, exc)
            return []

    def get_compliance_summary(self, job_id: int) -> dict:
        """
        Get SLA compliance summary for the last 90 days.
        Re-raises on error — compliance is required for the summary endpoint.
        """
        try:
            rows = self.connector.execute_query(SLA_COMPLIANCE_SUMMARY, {"job_id": job_id})
            return dict(rows[0]) if rows else {}
        except Exception as exc:
            logger.error("get_compliance_summary failed for job_id=%s: %s", job_id, exc)
            raise

    # ── Live State & Event History ────────────────────────────────────────────

    def get_live_state_history(self, job_id: int) -> list[dict]:
        """Get job live state history for the last 90 days."""
        try:
            rows = self.connector.execute_query(JOB_LIVE_STATE_HISTORY, {"job_id": job_id})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_live_state_history failed for job_id=%s: %s", job_id, exc)
            raise

    def get_event_history(
        self,
        job_name: str,
        limit: int = DEFAULT_EVENT_HISTORY_LIMIT,
    ) -> list[dict]:
        """Get job event history for the last 90 days."""
        try:
            rows = self.connector.execute_query(
                JOB_EVENT_HISTORY,
                {"job_name": job_name, "limit": limit},
            )
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_event_history failed for job=%s: %s", job_name, exc)
            raise

    # ── Heatmap & Trends ──────────────────────────────────────────────────────

    def get_heatmap_data(self, job_id: int) -> list[dict]:
        """Get day-of-week × hour heatmap for the last 90 days."""
        try:
            rows = self.connector.execute_query(HEATMAP_DAY_HOUR, {"job_id": job_id})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_heatmap_data failed for job_id=%s: %s", job_id, exc)
            raise

    def get_duration_distribution(
        self,
        job_id: int,
        bucket_size_minutes: int = DEFAULT_DURATION_BUCKET_MINUTES,
    ) -> list[dict]:
        """Get duration distribution histogram for the last 90 days."""
        try:
            rows = self.connector.execute_query(
                DURATION_DISTRIBUTION,
                {"job_id": job_id, "bucket_size_minutes": bucket_size_minutes},
            )
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_duration_distribution failed for job_id=%s: %s", job_id, exc)
            return []

    def get_sla_timeline(self, job_id: int) -> list[dict]:
        """Get daily SLA deviation timeline for the last 90 days."""
        try:
            rows = self.connector.execute_query(DAILY_SLA_TIMELINE, {"job_id": job_id})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_sla_timeline failed for job_id=%s: %s", job_id, exc)
            return []

    def get_trend_insights(self, job_id: int) -> Optional[dict]:
        """
        Compare current 90-day window against the prior 90-day window.
        Returns None if no data or on error — insights are optional, not critical.
        """
        try:
            rows = self.connector.execute_query(TREND_INSIGHTS, {"job_id": job_id})
            if not rows:
                return None

            row = dict(rows[0])

            today = date.today()
            current_from = today - timedelta(days=89)
            previous_to = current_from - timedelta(days=1)
            previous_from = previous_to - timedelta(days=89)

            insights: dict = {
                "current_period": {
                    "date_from": current_from.isoformat(),
                    "date_to": today.isoformat(),
                    "total_runs": row.get("current_total_runs") or 0,
                    "on_time_count": row.get("current_on_time_count") or 0,
                    "late_count": row.get("current_late_count") or 0,
                    "failed_count": row.get("current_failed_count") or 0,
                    "avg_duration_minutes": row.get("current_avg_duration"),
                    "p95_duration_minutes": row.get("current_p95_duration"),
                    "on_time_percentage": row.get("current_on_time_pct"),
                },
                "previous_period": {
                    "date_from": previous_from.isoformat(),
                    "date_to": previous_to.isoformat(),
                    "total_runs": row.get("previous_total_runs") or 0,
                    "on_time_count": row.get("previous_on_time_count") or 0,
                    "late_count": row.get("previous_late_count") or 0,
                    "failed_count": row.get("previous_failed_count") or 0,
                    "avg_duration_minutes": row.get("previous_avg_duration"),
                    "p95_duration_minutes": row.get("previous_p95_duration"),
                    "on_time_percentage": row.get("previous_on_time_pct"),
                },
                "worst_day_of_week": row.get("worst_day"),
                "worst_day_late_percentage": row.get("worst_day_late_pct"),
            }

            curr_avg = row.get("current_avg_duration")
            prev_avg = row.get("previous_avg_duration")
            if curr_avg is not None and prev_avg is not None and prev_avg > 0:
                change = round(((curr_avg - prev_avg) / prev_avg) * 100, 1)
                insights["duration_trend_percentage"] = change
                insights["duration_trend_direction"] = "faster" if change < 0 else "slower"

            curr_pct = row.get("current_on_time_pct")
            prev_pct = row.get("previous_on_time_pct")
            if curr_pct is not None and prev_pct is not None:
                change_pct = round(curr_pct - prev_pct, 1)
                insights["on_time_trend_change"] = change_pct
                insights["on_time_trend_direction"] = "improving" if change_pct > 0 else "declining"

            return insights

        except Exception as exc:
            logger.error("get_trend_insights failed for job_id=%s: %s", job_id, exc)
            return None

    def get_day_of_week_stats(self, job_id: int) -> list[dict]:
        """Get delay statistics per day of week for the last 90 days."""
        try:
            rows = self.connector.execute_query(DAY_OF_WEEK_DELAY_STATS, {"job_id": job_id})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_day_of_week_stats failed for job_id=%s: %s", job_id, exc)
            return []

    def get_day_of_week_sla_bars(self, job_id: int) -> list[dict]:
        """Get per-day-of-week expected vs actual SLA bar data for the chart."""
        try:
            rows = self.connector.execute_query(DAY_OF_WEEK_SLA_BARS, {"job_id": job_id})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_day_of_week_sla_bars failed for job_id=%s: %s", job_id, exc)
            return []

    def get_weekly_sla_bars(self, job_id: int) -> list[dict]:
        """Get per-day SLA bar data for the daily timeline chart."""
        try:
            rows = self.connector.execute_query(WEEKLY_SLA_BARS, {"job_id": job_id})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_weekly_sla_bars failed for job_id=%s: %s", job_id, exc)
            return []

    # ── Artifacts ─────────────────────────────────────────────────────────────

    def get_artifact_definitions(self, job_id: int) -> list[dict]:
        """Get artifact definitions for a job (static catalogue, no date range)."""
        try:
            rows = self.connector.execute_query(ARTIFACT_DEFINITIONS_BY_JOB, {"job_id": job_id})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_artifact_definitions failed for job_id=%s: %s", job_id, exc)
            return []

    def get_artifact_live_state(self, job_id: int) -> list[dict]:
        """Get artifact live state for the last 90 days."""
        try:
            rows = self.connector.execute_query(ARTIFACT_LIVE_STATE_BY_JOB, {"job_id": job_id})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_artifact_live_state failed for job_id=%s: %s", job_id, exc)
            return []

    def get_artifact_event_history(
        self,
        job_name: str,
        limit: int = DEFAULT_EVENT_HISTORY_LIMIT,
    ) -> list[dict]:
        """Get artifact event history for the last 90 days."""
        try:
            rows = self.connector.execute_query(
                ARTIFACT_EVENT_HISTORY_BY_JOB,
                {"job_name": job_name, "limit": limit},
            )
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_artifact_event_history failed for job=%s: %s", job_name, exc)
            raise

    # ── Proxy Rules ───────────────────────────────────────────────────────────

    def get_proxy_rules(self, job_id: int) -> list[dict]:
        """Get proxy inference rules for a job."""
        try:
            rows = self.connector.execute_query(PROXY_RULES_FOR_JOB, {"job_id": job_id})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_proxy_rules failed for job_id=%s: %s", job_id, exc)
            return []

    def get_trigger_rules(self, job_id: int) -> list[dict]:
        """Get trigger rules for a job (jobs this job triggers)."""
        try:
            rows = self.connector.execute_query(PROXY_TRIGGERS_FOR_JOB, {"job_id": job_id})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_trigger_rules failed for job_id=%s: %s", job_id, exc)
            return []

    # ── Incidents ─────────────────────────────────────────────────────────────

    def get_sev1_incidents(self, job_name: str) -> list[dict]:
        """Get SEV1 incidents for the last 90 days."""
        try:
            rows = self.connector.execute_query(SEV1_INCIDENTS_BY_JOB, {"job_name": job_name})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_sev1_incidents failed for job=%s: %s", job_name, exc)
            return []

    def get_incident_overrides(self, job_name: str) -> list[dict]:
        """Get incident overrides for the last 90 days."""
        try:
            rows = self.connector.execute_query(INCIDENT_OVERRIDES_BY_JOB, {"job_name": job_name})
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("get_incident_overrides failed for job=%s: %s", job_name, exc)
            return []
