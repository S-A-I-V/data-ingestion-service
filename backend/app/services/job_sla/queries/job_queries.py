"""
Job definition and live state queries for Job SLA Analyzer.

History queries use a fixed 90-day rolling window computed in SQL.
No date parameters are accepted — the window is always CURRENT_DATE - 89 days
through CURRENT_DATE.

Tables used:
- job_definitions: Master catalogue of all pipeline jobs
- job_live_state: Current runtime state per job/data_date/client
- job_event_history: Immutable event log for job state transitions
"""

# ── Job Definitions ───────────────────────────────────────────────────────────

JOB_DEFINITIONS_LIST = """
SELECT
    jd.job_id,
    jd.job_name,
    jd.owner_email,
    jd.oncall_project_name,
    jd.oncall_contact,
    jd.job_owner_name,
    jd.l3_owner_name,
    jd.l2_owner_name,
    jd.support_team_dl,
    jd.oncall_name,
    jd.oncall_flag,
    jd.created_at,
    jd.updated_at
FROM job_definitions jd
WHERE jd.is_deleted IS NOT TRUE
ORDER BY jd.job_name
"""

JOB_DEFINITION_BY_ID = """
SELECT
    jd.job_id,
    jd.job_name,
    jd.owner_email,
    jd.oncall_project_name,
    jd.oncall_contact,
    jd.job_owner_name,
    jd.l3_owner_name,
    jd.l2_owner_name,
    jd.support_team_dl,
    jd.oncall_name,
    jd.oncall_flag,
    jd.created_at,
    jd.updated_at
FROM job_definitions jd
WHERE jd.job_id = :job_id
  AND jd.is_deleted IS NOT TRUE
LIMIT 1
"""

# ── Job Live State History (90-day window) ────────────────────────────────────

JOB_LIVE_STATE_HISTORY = """
SELECT
    jls.job_id,
    jls.job_name,
    jls.data_date,
    jls.client_name,
    jls.current_status,
    jls.completion_percentage,
    jls.delay_status,
    jls.delay_duration_minutes,
    jls.start_time,
    jls.end_time,
    jls.updated_at,
    jls.jeet_threshold,
    jls.reet_threshold,
    jls.expected_start_time,
    jls.job_expected_sla,
    jls.projected_end_time,
    jls.expected_duration_minutes,
    jls.observed_duration_seconds,
    jls.run_id,
    jls.job_url,
    jls.orchestrator_name,
    jls.message_source,
    jls.reissue_version,
    jls.sev1_numbers,
    jls.sev1_urls,
    jls.job_delay_reason
FROM job_live_state jls
WHERE jls.job_id = :job_id
  AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND jls.data_date <= CURRENT_DATE
ORDER BY jls.data_date DESC, jls.client_name
"""

# ── Job Event History (90-day window) ────────────────────────────────────────

JOB_EVENT_HISTORY = """
SELECT
    jeh.event_id,
    jeh.job_name,
    jeh.data_date,
    jeh.status,
    jeh.source,
    jeh.event_timestamp,
    jeh.job_start_timestamp,
    jeh.completion_percent,
    jeh.run_id,
    jeh.job_url,
    jeh.reissue_version,
    jeh.orchestrator_name,
    jeh.client_name,
    jeh.created_at
FROM job_event_history jeh
WHERE jeh.job_name = :job_name
  AND jeh.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND jeh.data_date <= CURRENT_DATE
ORDER BY jeh.created_at DESC
LIMIT :limit
"""
