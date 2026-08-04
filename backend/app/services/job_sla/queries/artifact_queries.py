"""
Artifact tracking queries for Job SLA Analyzer.

Live state and event history queries use a fixed 90-day rolling window.

Tables used:
- artifact_definitions: Expected artifacts per job
- artifact_live_state: Current state of specific artifact files
- artifact_event_history: Immutable log of artifact state changes
"""

# ── Artifact Definitions (no date range — static catalogue) ──────────────────

ARTIFACT_DEFINITIONS_BY_JOB = """
SELECT
    ad.definition_id::text,
    ad.parent_job_name,
    ad.parent_job_id,
    ad.job_name,
    ad.artifact_pattern,
    ad.type,
    ad.expected_count,
    ad.completion_trigger,
    ad.triggers_job_status,
    ad.source_type
FROM artifact_definitions ad
WHERE ad.parent_job_id = :job_id
ORDER BY ad.job_name, ad.artifact_pattern
"""

# ── Artifact Live State (90-day window) ──────────────────────────────────────

ARTIFACT_LIVE_STATE_BY_JOB = """
SELECT
    als.artifact_id::text,
    als.parent_job_name,
    als.parent_job_id,
    als.data_date,
    als.actual_filename,
    als.status,
    als.timestamp,
    als.source_type,
    als.identifier,
    als.release_status,
    als.release_type,
    als.received_time,
    als.release_time,
    als.completion_percent,
    als.scheduled_release_time,
    als.observed_duration_seconds,
    als.created_at
FROM artifact_live_state als
WHERE als.parent_job_id = :job_id
  AND als.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND als.data_date <= CURRENT_DATE
ORDER BY als.data_date DESC, als.actual_filename
"""

# ── Artifact Event History (90-day window) ────────────────────────────────────

ARTIFACT_EVENT_HISTORY_BY_JOB = """
SELECT
    aeh.event_id::text,
    aeh.source_type,
    aeh.parent_job_name,
    aeh.data_date,
    aeh.identifier,
    aeh.file_name,
    aeh.status,
    aeh.completion_percent,
    aeh.event_timestamp,
    aeh.received_time,
    aeh.release_time,
    aeh.scheduled_release_time,
    aeh.release_type,
    aeh.report_name,
    aeh.delivery_date,
    aeh.client_name,
    aeh.created_at
FROM artifact_event_history aeh
WHERE aeh.parent_job_name = :job_name
  AND aeh.data_date >= CURRENT_DATE - INTERVAL '89 days'
  AND aeh.data_date <= CURRENT_DATE
ORDER BY aeh.created_at DESC
LIMIT :limit
"""
