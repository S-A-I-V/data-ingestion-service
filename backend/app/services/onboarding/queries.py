"""
SQL query builders and data fetchers for client onboarding.

All functions accept a connector instance and return structured data.
The build_onboarding_statements function produces the full list of
parameterized statements for atomic transaction execution.
"""

from typing import Any

from fastapi import HTTPException

from app.services.connectors.base import SQLAlchemyConnector


def fetch_report_definitions(
    connector: SQLAlchemyConnector,
) -> list[dict[str, Any]]:
    """Fetch available (non-deleted) report definitions."""
    results = connector.execute_query(
        """
        SELECT report_id, report_name, application_name,
               is_deleted, is_fastie
        FROM public.report_definitions
        WHERE is_deleted = false OR is_deleted IS NULL
        ORDER BY application_name, report_name
        """,
        {},
    )
    return [dict(row) for row in results] if results else []


def fetch_next_ids(connector: SQLAlchemyConnector) -> dict[str, int]:
    """
    Fetch the next available IDs for client_id, group_id,
    and record counts for UUID-based tables.
    """
    client_result = connector.execute_query(
        "SELECT COALESCE(MAX(client_id), 0) AS max_id " "FROM public.client_details",
        {},
    )
    max_client_id = client_result[0]["max_id"] if client_result else 0

    group_result = connector.execute_query(
        "SELECT COALESCE(MAX(group_id), 0) AS max_id " 'FROM public."groups"',
        {},
    )
    max_group_id = group_result[0]["max_id"] if group_result else 0

    detail_count_result = connector.execute_query("SELECT COUNT(*) AS cnt FROM public.client_details", {})
    detail_count = detail_count_result[0]["cnt"] if detail_count_result else 0

    crm_count_result = connector.execute_query("SELECT COUNT(*) AS cnt FROM public.client_report_mapping", {})
    crm_count = crm_count_result[0]["cnt"] if crm_count_result else 0

    return {
        "next_client_id": max_client_id + 1,
        "next_group_id": max_group_id + 1,
        "next_detail_id": detail_count + 1,
        "next_crm_id": crm_count + 1,
    }


def check_duplicates(
    connector: SQLAlchemyConnector,
    *,
    client_id: int,
    client_name: str,
    group_id: int,
    group_name: str,
) -> None:
    """
    Verify no collisions exist before inserting.
    Raises HTTPException 409 if client_id, client_name,
    group_id, or group_name already exists.
    """
    # Check client_id collision
    result = connector.execute_query(
        "SELECT client_id FROM public.client_details " "WHERE client_id = :cid",
        {"cid": client_id},
    )
    if result:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Client ID {client_id} already exists. "
                "The database was modified since your preview. "
                "Please try again — a fresh ID will be assigned."
            ),
        )

    # Check client_name collision
    result = connector.execute_query(
        "SELECT client_id FROM public.client_details " "WHERE LOWER(client_name) = LOWER(:name)",
        {"name": client_name},
    )
    if result:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Client '{client_name}' already exists "
                f"(client_id={result[0]['client_id']}). "
                "Duplicate onboarding prevented."
            ),
        )

    # Check group_id collision
    result = connector.execute_query(
        'SELECT group_id FROM public."groups" ' "WHERE group_id = :gid",
        {"gid": group_id},
    )
    if result:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Group ID {group_id} already exists. "
                "The database was modified since your preview. "
                "Please try again."
            ),
        )

    # Check group_name collision
    result = connector.execute_query(
        'SELECT group_id FROM public."groups" ' "WHERE LOWER(group_name) = LOWER(:name)",
        {"name": group_name},
    )
    if result:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Group '{group_name}' already exists "
                f"(group_id={result[0]['group_id']}). "
                "Duplicate onboarding prevented."
            ),
        )


def fetch_report_map(
    connector: SQLAlchemyConnector,
    report_ids: list[int],
) -> dict[int, dict[str, Any]]:
    """Fetch report details for a list of report IDs."""
    if not report_ids:
        return {}

    placeholders = ", ".join([f":rid{i}" for i in range(len(report_ids))])
    params = {f"rid{i}": rid for i, rid in enumerate(report_ids)}
    query = f"SELECT report_id, report_name, application_name FROM public.report_definitions WHERE report_id IN ({placeholders})"  # noqa: S608, E501
    results = connector.execute_query(query, params)
    return {r["report_id"]: r for r in results} if results else {}


def build_onboarding_statements(
    *,
    client_id: int,
    client_name: str,
    group_id: int,
    group_name: str,
    beids: list[int],
    org_id: str,
    report_ids: list[int],
    report_map: dict[int, dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Build the complete list of parameterized SQL statements for
    atomic client onboarding. Returns list of {sql, params} dicts.
    """
    statements: list[dict[str, Any]] = []

    # 1. Insert client_details
    statements.append(
        {
            "sql": """
            INSERT INTO public.client_details(
                client_id, client_name, id,
                created_by, created_at, updated_at, updated_by
            ) VALUES(
                :client_id, :client_name, gen_random_uuid(),
                'NFC_Team', now(), now(), 'NFC_Team'
            )
        """,
            "params": {
                "client_id": client_id,
                "client_name": client_name,
            },
        }
    )

    # 2. Insert group
    statements.append(
        {
            "sql": """
            INSERT INTO public."groups"(
                group_id, group_name,
                created_at, updated_at, created_by, updated_by
            ) VALUES(
                :group_id, :group_name,
                now(), now(), 'NFC_Team', 'NFC_Team'
            )
        """,
            "params": {
                "group_id": group_id,
                "group_name": group_name,
            },
        }
    )

    # 3. Link client to group
    statements.append(
        {
            "sql": """
            INSERT INTO public.client_groups(
                group_id, client_id,
                created_at, updated_at, created_by, updated_by
            ) VALUES(
                :group_id, :client_id,
                now(), now(), 'NFC_Team', 'NFC_Team'
            )
        """,
            "params": {
                "group_id": group_id,
                "client_id": client_id,
            },
        }
    )

    # 4. Business entity → client mapping (one per BEID)
    for beid in beids:
        statements.append(
            {
                "sql": """
                INSERT INTO public.business_entity_client_mapping(
                    business_entity_id, client_id,
                    created_at, created_by, updated_at, updated_by
                ) VALUES(
                    :beid, :client_id,
                    now(), 'NFC_Team', now(), 'NFC_Team'
                )
            """,
                "params": {"beid": beid, "client_id": client_id},
            }
        )

    # 5. Business entity → org mapping (one per BEID)
    for beid in beids:
        statements.append(
            {
                "sql": """
                INSERT INTO public.business_entity_org_mapping(
                    business_entity_id, org_id,
                    created_at, created_by, updated_at, updated_by
                ) VALUES(
                    :beid, :org_id,
                    now(), 'NFC_Team', now(), 'NFC_Team'
                )
            """,
                "params": {"beid": beid, "org_id": org_id},
            }
        )

    # 6. Client → report mapping
    for rid in report_ids:
        info = report_map.get(rid, {})
        statements.append(
            {
                "sql": """
                INSERT INTO public.client_report_mapping(
                    client_id, report_name, application_name,
                    report_id, id,
                    created_by, created_at, updated_at, updated_by
                ) VALUES(
                    :client_id, :report_name, :app_name,
                    :report_id, gen_random_uuid(),
                    'NFC_Team', now(), now(), 'NFC_Team'
                )
            """,
                "params": {
                    "client_id": client_id,
                    "report_name": info.get("report_name", ""),
                    "app_name": info.get("application_name", ""),
                    "report_id": rid,
                },
            }
        )

    return statements
