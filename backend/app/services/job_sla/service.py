"""
Job SLA Analyzer service - orchestrates queries and data assembly.

This service provides a high-level API for the Job SLA Analyzer feature,
coordinating queries across multiple tables and assembling results.
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
    DURATION_DISTRIBUTION,
    HEATMAP_DAY_HOUR,
    INCIDENT_OVERRIDES_BY_JOB,
    JOB_DEFINITION_BY_ID,
    JOB_DEFINITIONS_LIST,
    JOB_EVENT_HISTORY,
    JOB_LIVE_STATE_HISTORY,
    MONTHLY_TREND,
    PROXY_RULES_FOR_JOB,
    PROXY_TRIGGERS_FOR_JOB,
    SEV1_INCIDENTS_BY_JOB,
    SLA_COMPLIANCE_SUMMARY,
    SLA_POLICIES_BY_JOB,
    TREND_INSIGHTS,
    WEEKLY_TREND,
)

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

DEFAULT_DATE_RANGE_DAYS = 30
DEFAULT_EVENT_HISTORY_LIMIT = 500
DEFAULT_DURATION_BUCKET_MINUTES = 5


class JobSlaService:
    """
    Service class for Job SLA analysis operations.

    All methods accept a db_connector instance (from resolve_nfc_prod_connection)
    and return dictionaries suitable for JSON serialization.
    """

    def __init__(self, connector: Any):
        """Initialize with a database connector."""
        self.connector = connector

    # ── Job Listing ───────────────────────────────────────────────────────────

    def list_jobs(self, include_types: bool = False) -> list[dict]:
        """
        Get all active job definitions.

        Args:
            include_types: If True, includes job type info (artifact/proxy) for each job.
                          WARNING: This is slow for large job lists - use separate batch query instead.
        """
        rows = self.connector.execute_query(JOB_DEFINITIONS_LIST)
        jobs = [dict(row) for row in rows]

        if include_types:
            # This is slow - consider using get_all_job_types() instead
            for job in jobs:
                job_type = self.get_job_type(job["job_id"], job["job_name"])
                job["job_type"] = job_type["type"]
                job["has_artifacts"] = job_type["has_artifacts"]
                job["is_proxy"] = job_type["is_proxy"]
                job["is_trigger"] = job_type["is_trigger"]

        return jobs

    def get_all_job_types(self) -> dict[int, dict]:
        """
        Get job types for all jobs in a single batch query.
        Much more efficient than calling get_job_type() for each job.

        Returns:
            Dict mapping job_id to {type, has_artifacts, is_proxy, is_trigger}
        """
        # Get all artifact jobs in one query
        artifact_jobs = self.connector.execute_query(
            "SELECT DISTINCT parent_job_id FROM artifact_definitions WHERE parent_job_id IS NOT NULL"
        )
        artifact_job_ids = {row["parent_job_id"] for row in artifact_jobs}

        # Get all proxy jobs in one query
        proxy_jobs = self.connector.execute_query(
            "SELECT DISTINCT proxy_job_id FROM job_proxy_inference_rules WHERE is_enabled = true"
        )
        proxy_job_ids = {row["proxy_job_id"] for row in proxy_jobs}

        # Get all trigger jobs in one query
        trigger_jobs = self.connector.execute_query(
            "SELECT DISTINCT trigger_job_id FROM job_proxy_inference_rules WHERE is_enabled = true"
        )
        trigger_job_ids = {row["trigger_job_id"] for row in trigger_jobs}

        # Get all job IDs
        all_jobs = self.connector.execute_query("SELECT job_id FROM job_definitions WHERE is_deleted IS NOT TRUE")

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
        """Get a single job definition by ID."""
        rows = self.connector.execute_query(JOB_DEFINITION_BY_ID, {"job_id": job_id})
        return dict(rows[0]) if rows else None

    # ── Job Type Detection ────────────────────────────────────────────────────

    def get_job_type(self, job_id: int, job_name: str) -> dict:
        """
        Detect job type: standard, artifact, or proxy.

        Returns dict with:
        - type: 'standard' | 'artifact' | 'proxy' | 'artifact_proxy'
        - has_artifacts: bool
        - is_proxy: bool
        - is_trigger: bool (triggers other proxy jobs)
        """
        artifact_defs = self.connector.execute_query(ARTIFACT_DEFINITIONS_BY_JOB, {"job_id": job_id})
        proxy_rules = self.connector.execute_query(PROXY_RULES_FOR_JOB, {"job_id": job_id})
        trigger_rules = self.connector.execute_query(PROXY_TRIGGERS_FOR_JOB, {"job_id": job_id})

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

    # ── SLA Compliance ────────────────────────────────────────────────────────

    def get_sla_policies(self, job_name: str) -> list[dict]:
        """Get SLA policies configured for a job."""
        rows = self.connector.execute_query(SLA_POLICIES_BY_JOB, {"job_name": job_name})
        policies = [dict(row) for row in rows]

        # If no policies in sla_policies table, try to infer from job_live_state
        if not policies:
            inferred = self._infer_sla_from_live_state(job_name)
            if inferred:
                policies = [inferred]

        return policies

    def _infer_sla_from_live_state(self, job_name: str) -> Optional[dict]:
        """
        Infer SLA schedule from job_live_state when no explicit sla_policies exist.
        Uses the most recent runs to determine typical SLA times.
        """
        query = """
        SELECT
            job_expected_sla,
            expected_start_time,
            EXTRACT(DOW FROM data_date) AS day_of_week,
            COUNT(*) AS run_count
        FROM job_live_state
        WHERE job_name = :job_name
          AND job_expected_sla IS NOT NULL
          AND data_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY job_expected_sla, expected_start_time, EXTRACT(DOW FROM data_date)
        ORDER BY run_count DESC
        LIMIT 1
        """
        try:
            rows = self.connector.execute_query(query, {"job_name": job_name})
            if rows:
                row = rows[0]
                sla_time = row.get("job_expected_sla")
                start_time = row.get("expected_start_time")

                # Extract time portion if it's a datetime
                sla_time_str = None
                if sla_time:
                    if hasattr(sla_time, "strftime"):
                        sla_time_str = sla_time.strftime("%H:%M:%S")
                    else:
                        sla_time_str = str(sla_time).split(" ")[-1] if " " in str(sla_time) else str(sla_time)

                start_time_str = None
                if start_time:
                    if hasattr(start_time, "strftime"):
                        start_time_str = start_time.strftime("%H:%M:%S")
                    else:
                        start_time_str = str(start_time).split(" ")[-1] if " " in str(start_time) else str(start_time)

                return {
                    "policy_id": "inferred",
                    "entity_name": job_name,
                    "entity_type": "job",
                    "application_name": None,
                    "day_of_week": None,  # Inferred as daily
                    "expected_time": None,
                    "expected_start_time": start_time_str,
                    "expected_sla_time": sla_time_str,
                    "timezone": "UTC",
                    "days_addition_start_time": 0,
                    "days_addition_sla": 0,
                    "expected_duration_minutes": None,
                    "schedule_frequency": "daily (inferred)",
                    "data_date_formula": None,
                    "created_at": None,
                }
        except Exception as exc:
            logger.warning("Failed to infer SLA from live state for job=%s: %s", job_name, exc)

        return None

    def get_compliance_summary(
        self,
        job_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> dict:
        """Get SLA compliance summary for a job over a date range."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        rows = self.connector.execute_query(
            SLA_COMPLIANCE_SUMMARY,
            {
                "job_id": job_id,
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
            },
        )
        return dict(rows[0]) if rows else {}

    # ── Live State History ────────────────────────────────────────────────────

    def get_live_state_history(
        self,
        job_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        """Get job live state history over a date range."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        rows = self.connector.execute_query(
            JOB_LIVE_STATE_HISTORY,
            {
                "job_id": job_id,
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
            },
        )
        return [dict(row) for row in rows]

    # ── Event History ─────────────────────────────────────────────────────────

    def get_event_history(
        self,
        job_name: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: int = DEFAULT_EVENT_HISTORY_LIMIT,
    ) -> list[dict]:
        """Get job event history (state transitions) over a date range."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        rows = self.connector.execute_query(
            JOB_EVENT_HISTORY,
            {
                "job_name": job_name,
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
                "limit": limit,
            },
        )
        return [dict(row) for row in rows]

    # ── Heatmap & Trends ──────────────────────────────────────────────────────

    def get_heatmap_data(
        self,
        job_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        """Get day-of-week × hour heatmap data."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        try:
            rows = self.connector.execute_query(
                HEATMAP_DAY_HOUR,
                {
                    "job_id": job_id,
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                },
            )
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("Heatmap query failed for job_id=%s: %s", job_id, exc)
            raise

    def get_weekly_trend(
        self,
        job_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        """Get weekly aggregated trend data."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        try:
            rows = self.connector.execute_query(
                WEEKLY_TREND,
                {
                    "job_id": job_id,
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                },
            )
            # Transform week_start to period_start for frontend compatibility
            return [
                {"period_start": row.get("week_start"), **{k: v for k, v in row.items() if k != "week_start"}}
                for row in rows
            ]
        except Exception as exc:
            logger.error("Weekly trend query failed for job_id=%s: %s", job_id, exc)
            raise

    def get_monthly_trend(
        self,
        job_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        """Get monthly aggregated trend data."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        try:
            rows = self.connector.execute_query(
                MONTHLY_TREND,
                {
                    "job_id": job_id,
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                },
            )
            # Transform month_start to period_start for frontend compatibility
            return [
                {"period_start": row.get("month_start"), **{k: v for k, v in row.items() if k != "month_start"}}
                for row in rows
            ]
        except Exception as exc:
            logger.error("Monthly trend query failed for job_id=%s: %s", job_id, exc)
            raise

    def get_duration_distribution(
        self,
        job_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        bucket_size_minutes: int = DEFAULT_DURATION_BUCKET_MINUTES,
    ) -> list[dict]:
        """Get duration distribution for histogram."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        rows = self.connector.execute_query(
            DURATION_DISTRIBUTION,
            {
                "job_id": job_id,
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
                "bucket_size_minutes": bucket_size_minutes,
            },
        )
        return [dict(row) for row in rows]

    def get_sla_timeline(
        self,
        job_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        """
        Get daily SLA deviation timeline data.

        Returns daily data points with:
        - data_date: The date of the job run
        - expected_sla_minutes: Expected completion time as minutes from midnight
        - actual_end_minutes: Actual completion time as minutes from midnight
        - deviation_minutes: Difference (positive = late, negative = early)
        - current_status: Job status
        """
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        try:
            rows = self.connector.execute_query(
                DAILY_SLA_TIMELINE,
                {
                    "job_id": job_id,
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                },
            )
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("SLA timeline query failed for job_id=%s: %s", job_id, exc)
            return []

    # ── Artifacts ─────────────────────────────────────────────────────────────

    def get_artifact_definitions(self, job_id: int) -> list[dict]:
        """Get artifact definitions for a job."""
        rows = self.connector.execute_query(ARTIFACT_DEFINITIONS_BY_JOB, {"job_id": job_id})
        return [dict(row) for row in rows]

    def get_artifact_live_state(
        self,
        job_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        """Get artifact live state for a job over a date range."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        rows = self.connector.execute_query(
            ARTIFACT_LIVE_STATE_BY_JOB,
            {
                "job_id": job_id,
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
            },
        )
        return [dict(row) for row in rows]

    def get_artifact_event_history(
        self,
        job_name: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: int = DEFAULT_EVENT_HISTORY_LIMIT,
    ) -> list[dict]:
        """Get artifact event history for a job."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        try:
            rows = self.connector.execute_query(
                ARTIFACT_EVENT_HISTORY_BY_JOB,
                {
                    "job_name": job_name,
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                    "limit": limit,
                },
            )
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("Artifact event history query failed for job=%s: %s", job_name, exc)
            raise

    # ── Proxy Rules ───────────────────────────────────────────────────────────

    def get_proxy_rules(self, job_id: int) -> list[dict]:
        """Get proxy inference rules where this job is the proxy."""
        rows = self.connector.execute_query(PROXY_RULES_FOR_JOB, {"job_id": job_id})
        return [dict(row) for row in rows]

    def get_trigger_rules(self, job_id: int) -> list[dict]:
        """Get proxy inference rules where this job is the trigger."""
        rows = self.connector.execute_query(PROXY_TRIGGERS_FOR_JOB, {"job_id": job_id})
        return [dict(row) for row in rows]

    # ── Incidents ─────────────────────────────────────────────────────────────

    def get_sev1_incidents(
        self,
        job_name: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        """Get SEV1 incidents for a job over a date range."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        rows = self.connector.execute_query(
            SEV1_INCIDENTS_BY_JOB,
            {
                "job_name": job_name,
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
            },
        )
        return [dict(row) for row in rows]

    def get_incident_overrides(
        self,
        job_name: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        """Get incident overrides for a job over a date range."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        rows = self.connector.execute_query(
            INCIDENT_OVERRIDES_BY_JOB,
            {
                "job_name": job_name,
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
            },
        )
        return [dict(row) for row in rows]

    # ── Enhanced Trend Insights ───────────────────────────────────────────────

    def get_trend_insights(
        self,
        job_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> Optional[dict]:
        """
        Get trend insights comparing current period to previous period.

        Includes:
        - Period-over-period comparison
        - Worst performing day of week
        - Duration trends (avg and P95)

        Returns:
            Dict with insights data, or None if no data available.
        """
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        # Calculate the previous period with the same length
        period_length = (date_to - date_from).days
        previous_to = date_from - timedelta(days=1)
        previous_from = previous_to - timedelta(days=period_length)

        try:
            rows = self.connector.execute_query(
                TREND_INSIGHTS,
                {
                    "job_id": job_id,
                    "current_from": date_from.isoformat(),
                    "current_to": date_to.isoformat(),
                    "previous_from": previous_from.isoformat(),
                    "previous_to": previous_to.isoformat(),
                },
            )

            if not rows:
                return None

            row = dict(rows[0])

            # Compute trend direction and percentage changes
            insights = {
                "current_period": {
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
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

            # Calculate change percentages
            curr_avg = row.get("current_avg_duration")
            prev_avg = row.get("previous_avg_duration")
            if curr_avg is not None and prev_avg is not None and prev_avg > 0:
                duration_change_pct = round(((curr_avg - prev_avg) / prev_avg) * 100, 1)
                insights["duration_trend_percentage"] = duration_change_pct
                insights["duration_trend_direction"] = "faster" if duration_change_pct < 0 else "slower"

            curr_on_time = row.get("current_on_time_pct")
            prev_on_time = row.get("previous_on_time_pct")
            if curr_on_time is not None and prev_on_time is not None:
                on_time_change = round(curr_on_time - prev_on_time, 1)
                insights["on_time_trend_change"] = on_time_change
                insights["on_time_trend_direction"] = "improving" if on_time_change > 0 else "declining"

            return insights

        except Exception as exc:
            logger.error("Trend insights query failed for job_id=%s: %s", job_id, exc)
            return None

    def get_day_of_week_stats(
        self,
        job_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        """Get delay statistics per day of week."""
        date_to = date_to or date.today()
        date_from = date_from or (date_to - timedelta(days=DEFAULT_DATE_RANGE_DAYS))

        try:
            rows = self.connector.execute_query(
                DAY_OF_WEEK_DELAY_STATS,
                {
                    "job_id": job_id,
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                },
            )
            return [dict(row) for row in rows]
        except Exception as exc:
            logger.error("Day of week stats query failed for job_id=%s: %s", job_id, exc)
            return []
