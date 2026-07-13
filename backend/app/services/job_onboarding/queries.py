"""
SQL query builders and data fetchers for job onboarding.

Job onboarding flow:
  1. job_definitions — create the job entry
  2. sla_policies — create SLA rules (or inherit from trigger if proxy)
  3. job_proxy_inference_rules — link proxy job to trigger job
  4. artifact_definitions — define expected output artifacts

All functions accept a connector instance and return structured data.
"""

from typing import Any

from fastapi import HTTPException

from app.services.connectors.base import SQLAlchemyConnector
from app.services.job_onboarding.schemas import EditJobRequest, JobOnboardRequest

# ═══════════════════════════════════════════════════════════════════════════════
# Fetch Functions — Read from NFC Prod
# ═══════════════════════════════════════════════════════════════════════════════


def fetch_all_jobs(connector: SQLAlchemyConnector) -> list[dict[str, Any]]:
    """Fetch all job definitions for listing/search."""
    results = connector.execute_query(
        """
        SELECT job_id, job_name, owner_email, category,
               oncall_project_name, oncall_contact, is_deleted,
               job_owner_name, l3_owner_name, l2_owner_name,
               support_team_dl, oncall_name, oncall_flag,
               job_description, created_at, updated_at
        FROM public.job_definitions
        ORDER BY job_name
        """,
        {},
    )
    return [dict(r) for r in results] if results else []


def fetch_job_details(connector: SQLAlchemyConnector, job_id: int) -> dict[str, Any]:
    """Fetch full job configuration including SLA, proxy rules, and artifacts."""
    # Job definition
    job = connector.execute_query(
        """
        SELECT job_id, job_name, owner_email, category,
               oncall_project_name, oncall_contact, is_deleted,
               job_owner_name, l3_owner_name, l2_owner_name,
               support_team_dl, oncall_name, oncall_flag,
               job_description, created_at, updated_at
        FROM public.job_definitions
        WHERE job_id = :jid
        """,
        {"jid": job_id},
    )
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    job_data = dict(job[0])
    job_name = job_data["job_name"]

    # SLA policies
    sla_policies = fetch_job_sla_policies(connector, job_name)

    # Proxy rules (where this job is the proxy)
    proxy_rules = fetch_proxy_rules_for_job(connector, job_id)

    # Artifact definitions
    artifacts = fetch_artifact_definitions_for_job(connector, job_id)

    # Determine if proxy
    is_proxy = len(proxy_rules) > 0

    return {
        **job_data,
        "sla_policies": sla_policies,
        "proxy_rules": proxy_rules,
        "artifact_definitions": artifacts,
        "is_proxy": is_proxy,
    }


def fetch_job_sla_policies(connector: SQLAlchemyConnector, job_name: str) -> list[dict[str, Any]]:
    """Fetch SLA policies for a job (entity_type='job')."""
    results = connector.execute_query(
        """
        SELECT policy_id, entity_name, entity_type, application_name,
               day_of_week, expected_time, expected_start_time, expected_sla_time,
               timezone, days_addition_start_time, days_addition_sla,
               expected_duration_minutes, schedule_frequency,
               data_date_formula, created_at
        FROM public.sla_policies
        WHERE entity_name = :name AND entity_type = 'JOB'
        ORDER BY day_of_week
        """,
        {"name": job_name},
    )
    return [dict(r) for r in results] if results else []


def fetch_proxy_rules_for_job(connector: SQLAlchemyConnector, job_id: int) -> list[dict[str, Any]]:
    """Fetch proxy inference rules where this job is the proxy."""
    results = connector.execute_query(
        """
        SELECT id, proxy_job_id, proxy_job_name, proxy_job_status,
               proxy_completion_percentage, trigger_job_id, trigger_job_name,
               trigger_job_status, is_enabled, created_by, created_at, updated_at
        FROM public.job_proxy_inference_rules
        WHERE proxy_job_id = :jid
        ORDER BY trigger_job_name
        """,
        {"jid": job_id},
    )
    return [dict(r) for r in results] if results else []


def fetch_artifact_definitions_for_job(connector: SQLAlchemyConnector, job_id: int) -> list[dict[str, Any]]:
    """Fetch artifact definitions for a job."""
    results = connector.execute_query(
        """
        SELECT definition_id, parent_job_name, parent_job_id,
               artifact_pattern, "type", expected_count,
               completion_trigger, triggers_job_status,
               source_type, job_name
        FROM public.artifact_definitions
        WHERE parent_job_id = :jid
        ORDER BY artifact_pattern
        """,
        {"jid": job_id},
    )
    return [dict(r) for r in results] if results else []


def fetch_next_job_id(connector: SQLAlchemyConnector) -> int:
    """Fetch the next available job_id."""
    result = connector.execute_query(
        "SELECT COALESCE(MAX(job_id), 0) AS max_id FROM public.job_definitions",
        {},
    )
    return (result[0]["max_id"] if result else 0) + 1


def check_job_duplicates(connector: SQLAlchemyConnector, *, job_name: str) -> None:
    """Check if a job with this name already exists."""
    result = connector.execute_query(
        "SELECT job_id FROM public.job_definitions WHERE LOWER(job_name) = LOWER(:name)",
        {"name": job_name},
    )
    if result:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Job '{job_name}' already exists (job_id={result[0]['job_id']}). " "Duplicate onboarding prevented."
            ),
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Build Statements — Atomic Transaction Builders
# ═══════════════════════════════════════════════════════════════════════════════


def build_job_onboarding_statements(
    *,
    job_id: int,
    payload: JobOnboardRequest,
) -> list[dict[str, Any]]:
    """
    Build the complete list of parameterized SQL statements for
    atomic job onboarding.

    Flow:
      1. INSERT into job_definitions
      2. INSERT SLA policies (own or inherited from trigger)
      3. INSERT proxy inference rules (if proxy)
      4. INSERT artifact definitions (if any)
    """
    statements: list[dict[str, Any]] = []

    # ── 1. Job Definition ─────────────────────────────────────────────────────
    statements.append(
        {
            "sql": """
            INSERT INTO public.job_definitions(
                job_id, job_name, owner_email, category,
                oncall_project_name, oncall_contact,
                job_owner_name, l3_owner_name, l2_owner_name,
                support_team_dl, oncall_name, oncall_flag,
                job_description, is_deleted, created_at, updated_at
            ) VALUES(
                :job_id, :job_name, :owner_email, :category,
                :oncall_project_name, :oncall_contact,
                :job_owner_name, :l3_owner_name, :l2_owner_name,
                :support_team_dl, :oncall_name, :oncall_flag,
                :job_description, false, now(), now()
            )
        """,
            "params": {
                "job_id": job_id,
                "job_name": payload.job_name,
                "owner_email": payload.owner_email,
                "category": payload.category,
                "oncall_project_name": payload.oncall_project_name,
                "oncall_contact": payload.oncall_contact,
                "job_owner_name": payload.job_owner_name,
                "l3_owner_name": payload.l3_owner_name,
                "l2_owner_name": payload.l2_owner_name,
                "support_team_dl": payload.support_team_dl,
                "oncall_name": payload.oncall_name,
                "oncall_flag": payload.oncall_flag,
                "job_description": payload.job_description,
            },
        }
    )

    # ── 2. SLA Policies ──────────────────────────────────────────────────────
    # If NOT a proxy, create own SLA policies
    if not payload.is_proxy:
        for policy in payload.sla_policies:
            statements.append(
                {
                    "sql": """
                    INSERT INTO public.sla_policies(
                        policy_id, entity_name, entity_type, application_name,
                        day_of_week, schedule_frequency,
                        expected_start_time, expected_sla_time, expected_time,
                        timezone, days_addition_start_time, days_addition_sla,
                        expected_duration_minutes, data_date_formula, created_at
                    ) VALUES(
                        gen_random_uuid(), :entity_name, 'JOB', '',
                        :day_of_week, :schedule_frequency,
                        :expected_start_time, :expected_sla_time, :expected_time,
                        :timezone, :days_addition_start_time, :days_addition_sla,
                        :expected_duration_minutes, :data_date_formula, now()
                    )
                """,
                    "params": {
                        "entity_name": payload.job_name,
                        "day_of_week": policy.day_of_week,
                        "schedule_frequency": policy.schedule_frequency,
                        "expected_start_time": policy.expected_start_time,
                        "expected_sla_time": policy.expected_sla_time,
                        "expected_time": policy.expected_time,
                        "timezone": policy.timezone,
                        "days_addition_start_time": policy.days_addition_start_time,
                        "days_addition_sla": policy.days_addition_sla,
                        "expected_duration_minutes": policy.expected_duration_minutes,
                        "data_date_formula": policy.data_date_formula,
                    },
                }
            )

    # ── 3. Proxy Inference Rules ─────────────────────────────────────────────
    # If proxy, link to the trigger job(s). SLA policies are NOT created;
    # the platform infers them from the trigger job at runtime.
    for rule in payload.proxy_rules:
        statements.append(
            {
                "sql": """
                INSERT INTO public.job_proxy_inference_rules(
                    id, proxy_job_id, proxy_job_name, proxy_job_status,
                    proxy_completion_percentage,
                    trigger_job_id, trigger_job_name, trigger_job_status,
                    is_enabled, created_by, created_at, updated_at
                ) VALUES(
                    gen_random_uuid(), :proxy_job_id, :proxy_job_name, :proxy_job_status,
                    :proxy_completion_percentage,
                    :trigger_job_id, :trigger_job_name, :trigger_job_status,
                    true, 'NFC_Team', now(), now()
                )
            """,
                "params": {
                    "proxy_job_id": job_id,
                    "proxy_job_name": payload.job_name,
                    "proxy_job_status": rule.proxy_job_status,
                    "proxy_completion_percentage": rule.proxy_completion_percentage,
                    "trigger_job_id": rule.trigger_job_id,
                    "trigger_job_name": rule.trigger_job_name,
                    "trigger_job_status": rule.trigger_job_status,
                },
            }
        )

    # ── 4. Artifact Definitions ──────────────────────────────────────────────
    for artifact in payload.artifact_definitions:
        statements.append(
            {
                "sql": """
                INSERT INTO public.artifact_definitions(
                    definition_id, parent_job_name, parent_job_id,
                    artifact_pattern, "type", expected_count,
                    completion_trigger, triggers_job_status,
                    source_type, job_name
                ) VALUES(
                    gen_random_uuid(), :parent_job_name, :parent_job_id,
                    :artifact_pattern, :type, :expected_count,
                    :completion_trigger, :triggers_job_status,
                    :source_type, :job_name
                )
            """,
                "params": {
                    "parent_job_name": payload.job_name,
                    "parent_job_id": job_id,
                    "artifact_pattern": artifact.artifact_pattern,
                    "type": artifact.type,
                    "expected_count": artifact.expected_count,
                    "completion_trigger": artifact.completion_trigger,
                    "triggers_job_status": artifact.triggers_job_status,
                    "source_type": artifact.source_type,
                    "job_name": artifact.job_name or payload.job_name,
                },
            }
        )

    return statements


def build_job_edit_statements(
    *,
    connector: SQLAlchemyConnector,
    job_id: int,
    job_name: str,
    payload: EditJobRequest,
) -> dict[str, Any]:
    """
    Build diff-based SQL statements for editing an existing job.

    Returns {
        "statements": [...],
        "diff": { field-level change summary }
    }
    """
    statements: list[dict[str, Any]] = []
    diff: dict[str, Any] = {}

    # ── Job Definition Updates ────────────────────────────────────────────────
    update_fields = []
    update_params: dict[str, Any] = {"jid": job_id}

    field_map = {
        "owner_email": payload.owner_email,
        "category": payload.category,
        "oncall_project_name": payload.oncall_project_name,
        "oncall_contact": payload.oncall_contact,
        "job_owner_name": payload.job_owner_name,
        "l3_owner_name": payload.l3_owner_name,
        "l2_owner_name": payload.l2_owner_name,
        "support_team_dl": payload.support_team_dl,
        "oncall_name": payload.oncall_name,
        "oncall_flag": payload.oncall_flag,
        "job_description": payload.job_description,
    }

    for field, value in field_map.items():
        if value is not None:
            update_fields.append(f"{field} = :{field}")
            update_params[field] = value
            diff[f"{field}_changed"] = True

    if update_fields:
        update_fields.append("updated_at = now()")
        set_clause = ", ".join(update_fields)
        statements.append(
            {
                "sql": f"UPDATE public.job_definitions SET {set_clause} WHERE job_id = :jid",  # noqa: S608
                "params": update_params,
            }
        )

    # ── SLA Policies (full replacement) ──────────────────────────────────────
    if payload.sla_policies is not None:
        diff["sla_policies_replaced"] = True

        # Delete existing
        statements.append(
            {
                "sql": """
                DELETE FROM public.sla_policies
                WHERE entity_name = :name AND entity_type = 'JOB'
            """,
                "params": {"name": job_name},
            }
        )

        # Insert new
        for policy in payload.sla_policies:
            statements.append(
                {
                    "sql": """
                    INSERT INTO public.sla_policies(
                        policy_id, entity_name, entity_type, application_name,
                        day_of_week, schedule_frequency,
                        expected_start_time, expected_sla_time, expected_time,
                        timezone, days_addition_start_time, days_addition_sla,
                        expected_duration_minutes, data_date_formula, created_at
                    ) VALUES(
                        gen_random_uuid(), :entity_name, 'JOB', '',
                        :day_of_week, :schedule_frequency,
                        :expected_start_time, :expected_sla_time, :expected_time,
                        :timezone, :days_addition_start_time, :days_addition_sla,
                        :expected_duration_minutes, :data_date_formula, now()
                    )
                """,
                    "params": {
                        "entity_name": job_name,
                        "day_of_week": policy.day_of_week,
                        "schedule_frequency": policy.schedule_frequency,
                        "expected_start_time": policy.expected_start_time,
                        "expected_sla_time": policy.expected_sla_time,
                        "expected_time": policy.expected_time,
                        "timezone": policy.timezone,
                        "days_addition_start_time": policy.days_addition_start_time,
                        "days_addition_sla": policy.days_addition_sla,
                        "expected_duration_minutes": policy.expected_duration_minutes,
                        "data_date_formula": policy.data_date_formula,
                    },
                }
            )

    # ── Proxy Rules (full replacement) ───────────────────────────────────────
    if payload.proxy_rules is not None:
        diff["proxy_rules_replaced"] = True

        # Delete existing
        statements.append(
            {
                "sql": """
                DELETE FROM public.job_proxy_inference_rules
                WHERE proxy_job_id = :jid
            """,
                "params": {"jid": job_id},
            }
        )

        # Insert new
        for rule in payload.proxy_rules:
            statements.append(
                {
                    "sql": """
                    INSERT INTO public.job_proxy_inference_rules(
                        id, proxy_job_id, proxy_job_name, proxy_job_status,
                        proxy_completion_percentage,
                        trigger_job_id, trigger_job_name, trigger_job_status,
                        is_enabled, created_by, created_at, updated_at
                    ) VALUES(
                        gen_random_uuid(), :proxy_job_id, :proxy_job_name, :proxy_job_status,
                        :proxy_completion_percentage,
                        :trigger_job_id, :trigger_job_name, :trigger_job_status,
                        true, 'NFC_Team', now(), now()
                    )
                """,
                    "params": {
                        "proxy_job_id": job_id,
                        "proxy_job_name": job_name,
                        "proxy_job_status": rule.proxy_job_status,
                        "proxy_completion_percentage": rule.proxy_completion_percentage,
                        "trigger_job_id": rule.trigger_job_id,
                        "trigger_job_name": rule.trigger_job_name,
                        "trigger_job_status": rule.trigger_job_status,
                    },
                }
            )

    # ── Artifact Definitions (full replacement) ──────────────────────────────
    if payload.artifact_definitions is not None:
        diff["artifact_definitions_replaced"] = True

        # Delete existing
        statements.append(
            {
                "sql": """
                DELETE FROM public.artifact_definitions
                WHERE parent_job_id = :jid
            """,
                "params": {"jid": job_id},
            }
        )

        # Insert new
        for artifact in payload.artifact_definitions:
            statements.append(
                {
                    "sql": """
                    INSERT INTO public.artifact_definitions(
                        definition_id, parent_job_name, parent_job_id,
                        artifact_pattern, "type", expected_count,
                        completion_trigger, triggers_job_status,
                        source_type, job_name
                    ) VALUES(
                        gen_random_uuid(), :parent_job_name, :parent_job_id,
                        :artifact_pattern, :type, :expected_count,
                        :completion_trigger, :triggers_job_status,
                        :source_type, :job_name
                    )
                """,
                    "params": {
                        "parent_job_name": job_name,
                        "parent_job_id": job_id,
                        "artifact_pattern": artifact.artifact_pattern,
                        "type": artifact.type,
                        "expected_count": artifact.expected_count,
                        "completion_trigger": artifact.completion_trigger,
                        "triggers_job_status": artifact.triggers_job_status,
                        "source_type": artifact.source_type,
                        "job_name": artifact.job_name or job_name,
                    },
                }
            )

    return {"statements": statements, "diff": diff}
