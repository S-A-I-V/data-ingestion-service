"""
Proxy job inference queries for Job SLA Analyzer.

Tables used:
- job_proxy_inference_rules: Rules for inferring one job's status from another
- mch_tasks_mapping: Maps Airflow DAG tasks to proxy event names
"""

# ── Proxy Rules where job is the PROXY (status is inferred from triggers) ─────

PROXY_RULES_FOR_JOB = """
SELECT
    jpir.id,
    jpir.proxy_job_id,
    jpir.proxy_job_name,
    jpir.proxy_job_status,
    jpir.proxy_completion_percentage,
    jpir.trigger_job_id,
    jpir.trigger_job_name,
    jpir.trigger_job_status,
    jpir.is_enabled,
    jpir.created_by,
    jpir.created_at,
    jpir.updated_at
FROM job_proxy_inference_rules jpir
WHERE jpir.proxy_job_id = :job_id
  AND jpir.is_enabled = true
ORDER BY jpir.trigger_job_name, jpir.trigger_job_status
"""

# ── Proxy Rules where job is the TRIGGER (triggers other jobs' status) ────────

PROXY_TRIGGERS_FOR_JOB = """
SELECT
    jpir.id,
    jpir.proxy_job_id,
    jpir.proxy_job_name,
    jpir.proxy_job_status,
    jpir.proxy_completion_percentage,
    jpir.trigger_job_id,
    jpir.trigger_job_name,
    jpir.trigger_job_status,
    jpir.is_enabled,
    jpir.created_by,
    jpir.created_at,
    jpir.updated_at
FROM job_proxy_inference_rules jpir
WHERE jpir.trigger_job_id = :job_id
  AND jpir.is_enabled = true
ORDER BY jpir.proxy_job_name, jpir.proxy_job_status
"""

# ── MCH Tasks Mapping (Airflow DAG tasks → proxy events) ──────────────────────

MCH_TASKS_BY_PROXY_EVENT = """
SELECT
    mtm.dag_id,
    mtm.task_name,
    mtm.proxy_event_name,
    mtm.start_percent,
    mtm.running_percent,
    mtm.success_percent,
    mtm.created_at,
    mtm.updated_at
FROM mch_tasks_mapping mtm
WHERE mtm.proxy_event_name = :proxy_event_name
ORDER BY mtm.dag_id, mtm.task_name
"""
