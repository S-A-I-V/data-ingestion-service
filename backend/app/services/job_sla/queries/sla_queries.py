"""
SLA policy and compliance queries for Job SLA Analyzer.

Tables used:
- sla_policies: Generic SLA policy for jobs (expected times, timezone, etc.)
- job_live_state: For computing actual vs expected compliance
"""

# ── SLA Policies by Job ───────────────────────────────────────────────────────

SLA_POLICIES_BY_JOB = """
SELECT
    sp.policy_id,
    sp.entity_name,
    sp.entity_type,
    sp.application_name,
    sp.day_of_week,
    sp.expected_time,
    sp.expected_start_time,
    sp.expected_sla_time,
    sp.timezone,
    sp.days_addition_start_time,
    sp.days_addition_sla,
    sp.expected_duration_minutes,
    sp.schedule_frequency,
    sp.data_date_formula,
    sp.created_at
FROM sla_policies sp
WHERE sp.entity_name = :job_name
  AND sp.entity_type = 'job'
ORDER BY
    CASE sp.day_of_week
        WHEN 'monday' THEN 1
        WHEN 'tuesday' THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday' THEN 4
        WHEN 'friday' THEN 5
        WHEN 'saturday' THEN 6
        WHEN 'sunday' THEN 7
        ELSE 8
    END
"""

# ── SLA Compliance Summary ────────────────────────────────────────────────────
# Computes on-time vs delayed counts for a job over a date range

SLA_COMPLIANCE_SUMMARY = """
WITH compliance_data AS (
    SELECT
        jls.job_id,
        jls.data_date,
        jls.current_status,
        jls.delay_status,
        jls.start_time,
        jls.end_time,
        jls.expected_start_time,
        jls.job_expected_sla,
        jls.delay_duration_minutes,
        EXTRACT(DOW FROM jls.data_date) AS day_of_week,
        EXTRACT(HOUR FROM jls.end_time) AS completion_hour,
        CASE
            WHEN jls.delay_status IN ('client_delayed', 'internal_delayed') THEN 'delayed'
            WHEN jls.current_status = 'success' AND jls.end_time <= jls.job_expected_sla THEN 'on_time'
            WHEN jls.current_status = 'success' AND jls.end_time > jls.job_expected_sla THEN 'late'
            WHEN jls.current_status = 'running' THEN 'running'
            WHEN jls.current_status = 'failed' THEN 'failed'
            ELSE 'unknown'
        END AS compliance_status
    FROM job_live_state jls
    WHERE jls.job_id = :job_id
      AND CAST(jls.data_date AS date) BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
)
SELECT
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (WHERE compliance_status = 'on_time') AS on_time_count,
    COUNT(*) FILTER (WHERE compliance_status = 'late') AS late_count,
    COUNT(*) FILTER (WHERE compliance_status = 'delayed') AS delayed_count,
    COUNT(*) FILTER (WHERE compliance_status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE compliance_status = 'running') AS running_count,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE compliance_status = 'on_time') / NULLIF(COUNT(*), 0),
        2
    ) AS on_time_percentage,
    ROUND(AVG(delay_duration_minutes) FILTER (WHERE delay_duration_minutes > 0), 2) AS avg_delay_minutes,
    MAX(delay_duration_minutes) AS max_delay_minutes
FROM compliance_data
"""
