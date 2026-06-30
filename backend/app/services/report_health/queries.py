"""
All SQL queries for the Report Health service.

Rules enforced here:
  - Every query uses named bind parameters (:param) — never string interpolation.
  - Each constant is prefixed with its source table name for readability.
  - Queries are READ-ONLY — no INSERT/UPDATE/DELETE.

nfc_prod table dependency map:
  REPORT_LIVE_STATE_BY_DELIVERY_DATE  → report_live_state
  REPORT_JOB_MAPPING_BY_REPORT_IDS   → report_job_mapping
  JOB_LIVE_STATE_BY_JOB_IDS          → job_live_state
  JOB_DEFINITIONS_BY_JOB_IDS         → job_definitions
  JOB_LIVE_STATE_WINDOW_BY_JOB_IDS   → job_live_state (multi-date window)
  SEV1_INCIDENTS_BY_JOB_DATE         → sev1_incidents
  SLA_POLICIES_BY_JOB_NAMES          → sla_policies
"""

# ── report_live_state ─────────────────────────────────────────────────────────

REPORT_LIVE_STATE_BY_DELIVERY_DATE = """
SELECT
    rls.report_id,
    rls.report_name,
    rls.application_name,
    rls.data_date,
    rls.delivery_date,
    rls.client_name,
    rls.report_delivery_status,
    rls.report_delay_status,
    rls.report_delay_duration_minutes,
    rls.total_no_of_steps,
    rls.no_of_completed_steps,
    rls.no_of_running_steps,
    rls.no_of_delayed_steps,
    rls.bam_sla,
    rls.report_start_time,
    rls.report_end_time,
    rls.sev1_numbers,
    rls.sev1_urls,
    rls.delayed_job_name,
    rls.report_metadata,
    rls.workflow_coordinates,
    rls.coverage_start_date,
    rls.coverage_end_date,
    rls.updated_at
FROM report_live_state rls
WHERE CAST(rls.delivery_date AS date) = CAST(:delivery_date AS date)
ORDER BY
    -- Delayed first, then in-progress, then scheduled, then done
    CASE rls.report_delay_status
        WHEN 'client_delayed'   THEN 1
        WHEN 'internal_delayed' THEN 2
        WHEN 'unknown_state'    THEN 3
        ELSE 4
    END,
    rls.report_name
"""

# ── report_job_mapping ────────────────────────────────────────────────────────

REPORT_JOB_MAPPING_TEMPLATE = """
SELECT
    rjm.report_id,
    rjm.job_id,
    rjm.job_name,
    rjm.sequence_id,
    rjm.is_final_step,
    rjm.job_category,
    rjm.application_name,
    rjm.run_requirement_mode,
    rjm.previous_job_ids,
    rjm.next_job_ids,
    rjm.required_offsets_json
FROM report_job_mapping rjm
WHERE rjm.report_id IN ({report_id_placeholders})
ORDER BY rjm.report_id, rjm.sequence_id NULLS LAST, rjm.job_name
"""

# ── job_definitions ───────────────────────────────────────────────────────────

JOB_DEFINITIONS_TEMPLATE = """
SELECT
    jd.job_id,
    jd.job_name,
    jd.owner_email,
    jd.job_owner_name,
    jd.l3_owner_name,
    jd.l2_owner_name,
    jd.support_team_dl,
    jd.oncall_name,
    jd.oncall_contact,
    jd.oncall_flag,
    jd.category,
    jd.job_description
FROM job_definitions jd
WHERE jd.job_id IN ({job_id_placeholders})
  AND jd.is_deleted IS NOT TRUE
"""

# ── job_live_state ────────────────────────────────────────────────────────────
# Primary data_date query — gets the job state for the anchor data_date of
# each report in the result set.

# NOTE: The = ANY(:arr) PostgreSQL array syntax is NOT supported by all
# connectors (psycopg2 works, but the app's execute_query may not).
# The assembler builds IN-clause queries dynamically with numbered params.
# These templates use {placeholders} substitution (safe — values are always int/date).

JOB_LIVE_STATE_WINDOW_TEMPLATE = """
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
    jls.run_id,
    jls.job_url,
    jls.orchestrator_name,
    jls.message_source,
    jls.reissue_version,
    jls.sev1_numbers,
    jls.sev1_urls,
    jls.observed_duration_seconds
FROM job_live_state jls
WHERE jls.job_id IN ({job_id_placeholders})
  AND CAST(jls.data_date AS date) BETWEEN CAST(:window_start AS date) AND CAST(:window_end AS date)
ORDER BY jls.job_id, jls.data_date
"""

# ── sev1_incidents ────────────────────────────────────────────────────────────

SEV1_INCIDENTS_TEMPLATE = """
SELECT
    si.job_name,
    si.data_date,
    si.sev1_number,
    si.sev1_url,
    si.gspace_url,
    si.projected_end_time
FROM sev1_incidents si
WHERE si.job_name IN ({job_name_placeholders})
  AND CAST(si.data_date AS date) = CAST(:data_date AS date)
"""

# ── sla_policies ──────────────────────────────────────────────────────────────

SLA_POLICIES_BY_JOB_NAMES = """
SELECT
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
    sp.data_date_formula
FROM sla_policies sp
WHERE sp.entity_name = ANY(:entity_names)
  AND sp.entity_type = 'job'
"""
