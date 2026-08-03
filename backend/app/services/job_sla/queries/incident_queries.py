"""
Incident and override queries for Job SLA Analyzer.

Tables used:
- sev1_incidents: Severity-1 incidents linked to a job+data_date
- incident_overrides: Overrides SLA calculations when incidents are active
"""

# ── SEV1 Incidents ────────────────────────────────────────────────────────────

SEV1_INCIDENTS_BY_JOB = """
SELECT
    si.incident_id,
    si.job_name,
    si.data_date,
    si.sev1_number,
    si.sev1_url,
    si.gspace_url,
    si.projected_end_time,
    si.created_by,
    si.created_at
FROM sev1_incidents si
WHERE si.job_name = :job_name
  AND CAST(si.data_date AS date) BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
ORDER BY si.data_date DESC, si.created_at DESC
"""

# ── Incident Overrides ────────────────────────────────────────────────────────

INCIDENT_OVERRIDES_BY_JOB = """
SELECT
    io.override_id,
    io.job_name,
    io.data_date,
    io.proposed_end_time,
    io.ticket_url,
    io.created_by,
    io.created_at
FROM incident_overrides io
WHERE io.job_name = :job_name
  AND CAST(io.data_date AS date) BETWEEN CAST(:date_from AS date) AND CAST(:date_to AS date)
ORDER BY io.data_date DESC, io.created_at DESC
"""
