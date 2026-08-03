"""
Artifact tracking queries for Job SLA Analyzer.

Tables used:
- artifact_definitions: Expected artifacts per job
- artifact_live_state: Current state of specific artifact files
- artifact_event_history: Immutable log of artifact state changes
"""

# ── Artifact Definitions ──────────────────────────────────────────────────────

ARTIFACT_DEFINITIONS_BY_JOB = """
SELECT
    ad.definition_id,
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

# ── Artifact Live State ───────────────────────────────────────────────────────

ARTIFACT_LIVE_STATE_BY_JOB = """
SELECT
    als.artifact_id,
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
  AND CAST(als.data_date AS date) BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
ORDER BY als.data_date DESC, als.actual_filename
"""

# ── Artifact Event History ────────────────────────────────────────────────────

ARTIFACT_EVENT_HISTORY_BY_JOB = """
SELECT
    aeh.event_id,
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
  AND CAST(aeh.data_date AS date) BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
ORDER BY aeh.created_at DESC
LIMIT :limit
"""
