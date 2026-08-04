"""
SLA policy and compliance queries for Job SLA Analyzer.

Compliance summary uses a fixed 90-day rolling window computed in SQL.

Tables used:
- sla_policies: Generic SLA policy for jobs
- job_live_state: For computing actual vs expected compliance
"""

# ── SLA Policies by Job ───────────────────────────────────────────────────────

SLA_POLICIES_BY_JOB = """
SELECT
    sp.policy_id::text,
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
  AND sp.entity_type = 'JOB'
ORDER BY
    CASE sp.day_of_week
        WHEN 'monday'    THEN 1
        WHEN 'tuesday'   THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday'  THEN 4
        WHEN 'friday'    THEN 5
        WHEN 'saturday'  THEN 6
        WHEN 'sunday'    THEN 7
        ELSE 8
    END
"""

# ── SLA Compliance Summary (90-day window) ────────────────────────────────────

# ── SLA Compliance Summary (90-day window) ────────────────────────────────────
# avg_delay_minutes and max_delay_minutes are computed as the arithmetic
# difference between actual end_time and job_expected_sla, for all runs
# that finished after the SLA deadline. This captures every overrun regardless
# of whether the platform set the delay_status flag.
#
# delayed_count uses the delay_status flag because that reflects runs that
# were formally categorised as delayed (client or internal cause), which is
# a distinct business concept from "ran late vs SLA deadline".

SLA_COMPLIANCE_SUMMARY = """
WITH compliance_data AS (
    SELECT
        CASE
            WHEN jls.delay_status IN ('client_delayed', 'internal_delayed') THEN 'delayed'
            WHEN jls.current_status = 'success'
             AND jls.end_time <= jls.job_expected_sla                       THEN 'on_time'
            WHEN jls.current_status = 'success'
             AND jls.end_time > jls.job_expected_sla                        THEN 'late'
            WHEN jls.current_status = 'running'                             THEN 'running'
            WHEN jls.current_status = 'failed'                              THEN 'failed'
            ELSE 'unknown'
        END AS compliance_status,
        -- How many minutes past the SLA deadline this run finished (NULL if on-time or no SLA)
        CASE
            WHEN jls.end_time > jls.job_expected_sla
             AND jls.end_time IS NOT NULL
             AND jls.job_expected_sla IS NOT NULL
            THEN EXTRACT(EPOCH FROM (jls.end_time - jls.job_expected_sla)) / 60.0
        END AS overrun_minutes
    FROM job_live_state jls
    WHERE jls.job_id = :job_id
      AND jls.data_date >= CURRENT_DATE - INTERVAL '89 days'
      AND jls.data_date <= CURRENT_DATE
)
SELECT
    COUNT(*)                                                           AS total_runs,
    COUNT(*) FILTER (WHERE compliance_status = 'on_time')             AS on_time_count,
    COUNT(*) FILTER (WHERE compliance_status = 'late')                AS late_count,
    COUNT(*) FILTER (WHERE compliance_status = 'delayed')             AS delayed_count,
    COUNT(*) FILTER (WHERE compliance_status = 'failed')              AS failed_count,
    COUNT(*) FILTER (WHERE compliance_status = 'running')             AS running_count,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE compliance_status = 'on_time')
        / NULLIF(COUNT(*), 0),
        2
    )                                                                  AS on_time_percentage,
    -- Avg and max are minutes past the SLA deadline, only for late runs
    ROUND(
        (AVG(overrun_minutes) FILTER (WHERE overrun_minutes IS NOT NULL))::numeric,
        2
    )                                                                  AS avg_delay_minutes,
    ROUND(
        MAX(overrun_minutes)::numeric,
        2
    )                                                                  AS max_delay_minutes
FROM compliance_data
"""
