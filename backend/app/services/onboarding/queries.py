"""
SQL query builders and data fetchers for client onboarding.

All functions accept a connector instance and return structured data.
The build_onboarding_statements function produces the full list of
parameterized statements for atomic transaction execution.
"""

from typing import Any, Optional

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
    beid_org_mappings: list[dict],
    report_ids: list[int],
    report_map: dict[int, dict[str, Any]],
    fastie_aliases: Optional[list[str]] = None,
) -> list[dict[str, Any]]:
    """
    Build the complete list of parameterized SQL statements for
    atomic client onboarding. Returns list of {sql, params} dicts.

    beid_org_mappings: list of {"beid": int, "org_id": str}
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
    for item in beid_org_mappings:
        beid = item["beid"]
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

    # 5. Business entity → org mapping (per-BEID org_id)
    for item in beid_org_mappings:
        beid = item["beid"]
        org_id = item["org_id"]
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

    # 7. Fastie client alias mapping (optional)
    for alias in fastie_aliases or []:
        statements.append(
            {
                "sql": """
                INSERT INTO public.fastie_client_alias_mapping(
                    client_id, fastie_client_name, is_active,
                    created_by, created_at, updated_by, updated_at
                ) VALUES(
                    :client_id, :alias_name, true,
                    'NFC_Team', now(), 'NFC_Team', now()
                )
            """,
                "params": {
                    "client_id": client_id,
                    "alias_name": alias,
                },
            }
        )

    return statements


# ═══════════════════════════════════════════════════════════════════════════════
# Edit Existing Client — Query Functions
# ═══════════════════════════════════════════════════════════════════════════════


def fetch_all_clients(connector: SQLAlchemyConnector) -> list[dict[str, Any]]:
    """Fetch all clients for the search/select dropdown."""
    results = connector.execute_query(
        """
        SELECT client_id, client_name, created_at
        FROM public.client_details
        ORDER BY client_name ASC
        """,
        {},
    )
    return [dict(r) for r in results] if results else []


def fetch_client_details(connector: SQLAlchemyConnector, client_id: int) -> dict[str, Any]:
    """Fetch full client configuration for editing."""
    # Client info
    client = connector.execute_query(
        "SELECT client_id, client_name FROM public.client_details WHERE client_id = :cid",
        {"cid": client_id},
    )
    if not client:
        raise HTTPException(status_code=404, detail=f"Client {client_id} not found")

    # Group info (via client_groups junction)
    group = connector.execute_query(
        """
        SELECT g.group_id, g.group_name
        FROM public."groups" g
        INNER JOIN public.client_groups cg ON cg.group_id = g.group_id
        WHERE cg.client_id = :cid
        LIMIT 1
        """,
        {"cid": client_id},
    )

    # BEID mappings
    beids = connector.execute_query(
        """
        SELECT becm.business_entity_id AS beid,
               COALESCE(beom.org_id, '') AS org_id
        FROM public.business_entity_client_mapping becm
        LEFT JOIN public.business_entity_org_mapping beom
            ON becm.business_entity_id = beom.business_entity_id
        WHERE becm.client_id = :cid
        ORDER BY becm.business_entity_id
        """,
        {"cid": client_id},
    )

    # Report mappings
    reports = connector.execute_query(
        """
        SELECT report_id, report_name, application_name
        FROM public.client_report_mapping
        WHERE client_id = :cid
        ORDER BY report_name
        """,
        {"cid": client_id},
    )

    # Fastie aliases
    aliases = connector.execute_query(
        """
        SELECT fastie_client_name
        FROM public.fastie_client_alias_mapping
        WHERE client_id = :cid AND is_active = true
        ORDER BY fastie_client_name
        """,
        {"cid": client_id},
    )

    return {
        "client_id": client[0]["client_id"],
        "client_name": client[0]["client_name"],
        "group_id": group[0]["group_id"] if group else None,
        "group_name": group[0]["group_name"] if group else "",
        "beid_mappings": [{"beid": b["beid"], "org_id": b["org_id"]} for b in (beids or [])],
        "report_ids": [r["report_id"] for r in (reports or [])],
        "reports": [dict(r) for r in (reports or [])],
        "fastie_aliases": [a["fastie_client_name"] for a in (aliases or [])],
    }


def build_edit_statements(
    *,
    client_id: int,
    client_name: str,
    group_id: int,
    group_name: str,
    new_group_name: Optional[str],
    current_beids: list[dict],
    new_beids: list[dict],
    current_report_ids: list[int],
    new_report_ids: list[int],
    report_map: dict[int, dict[str, Any]],
    current_aliases: list[str],
    new_aliases: list[str],
) -> dict[str, Any]:
    """
    Build diff-based SQL statements for editing an existing client.

    Returns {
        "statements": [...],
        "diff": {
            "group_name_changed": bool,
            "beids_added": [...],
            "beids_removed": [...],
            "reports_added": [...],
            "reports_removed": [...],
            "aliases_added": [...],
            "aliases_removed": [...],
        }
    }
    """
    statements: list[dict[str, Any]] = []

    # ── Group name update ─────────────────────────────────────────────────────
    group_name_changed = False
    if new_group_name and new_group_name != group_name:
        group_name_changed = True
        statements.append(
            {
                "sql": """
                UPDATE public."groups"
                SET group_name = :new_name, updated_at = now(), updated_by = 'NFC_Team'
                WHERE group_id = :gid
            """,
                "params": {"new_name": new_group_name, "gid": group_id},
            }
        )

    # ── BEID diff ─────────────────────────────────────────────────────────────
    current_beid_set = {(b["beid"], b["org_id"]) for b in current_beids}
    new_beid_set = {(b["beid"], b["org_id"]) for b in new_beids}

    beids_added = new_beid_set - current_beid_set
    beids_removed = current_beid_set - new_beid_set

    for beid, _org_id in beids_removed:
        statements.append(
            {
                "sql": """
                DELETE FROM public.business_entity_client_mapping
                WHERE business_entity_id = :beid AND client_id = :cid
            """,
                "params": {"beid": beid, "cid": client_id},
            }
        )
        statements.append(
            {
                "sql": """
                DELETE FROM public.business_entity_org_mapping
                WHERE business_entity_id = :beid
            """,
                "params": {"beid": beid},
            }
        )

    for beid, org_id in beids_added:
        statements.append(
            {
                "sql": """
                INSERT INTO public.business_entity_client_mapping(
                    business_entity_id, client_id,
                    created_at, created_by, updated_at, updated_by
                ) VALUES(:beid, :cid, now(), 'NFC_Team', now(), 'NFC_Team')
            """,
                "params": {"beid": beid, "cid": client_id},
            }
        )
        statements.append(
            {
                "sql": """
                INSERT INTO public.business_entity_org_mapping(
                    business_entity_id, org_id,
                    created_at, created_by, updated_at, updated_by
                ) VALUES(:beid, :org_id, now(), 'NFC_Team', now(), 'NFC_Team')
            """,
                "params": {"beid": beid, "org_id": org_id},
            }
        )

    # ── Report diff ───────────────────────────────────────────────────────────
    current_report_set = set(current_report_ids)
    new_report_set = set(new_report_ids)

    reports_added = new_report_set - current_report_set
    reports_removed = current_report_set - new_report_set

    for rid in reports_removed:
        statements.append(
            {
                "sql": """
                DELETE FROM public.client_report_mapping
                WHERE client_id = :cid AND report_id = :rid
            """,
                "params": {"cid": client_id, "rid": rid},
            }
        )

    for rid in reports_added:
        info = report_map.get(rid, {})
        statements.append(
            {
                "sql": """
                INSERT INTO public.client_report_mapping(
                    client_id, report_name, application_name,
                    report_id, id,
                    created_by, created_at, updated_at, updated_by
                ) VALUES(
                    :cid, :report_name, :app_name,
                    :rid, gen_random_uuid(),
                    'NFC_Team', now(), now(), 'NFC_Team'
                )
            """,
                "params": {
                    "cid": client_id,
                    "report_name": info.get("report_name", ""),
                    "app_name": info.get("application_name", ""),
                    "rid": rid,
                },
            }
        )

    # ── Alias diff ────────────────────────────────────────────────────────────
    current_alias_set = set(current_aliases)
    new_alias_set = set(new_aliases)

    aliases_added = new_alias_set - current_alias_set
    aliases_removed = current_alias_set - new_alias_set

    for alias in aliases_removed:
        statements.append(
            {
                "sql": """
                UPDATE public.fastie_client_alias_mapping
                SET is_active = false, updated_at = now(), updated_by = 'NFC_Team'
                WHERE client_id = :cid AND fastie_client_name = :alias
            """,
                "params": {"cid": client_id, "alias": alias},
            }
        )

    for alias in aliases_added:
        statements.append(
            {
                "sql": """
                INSERT INTO public.fastie_client_alias_mapping(
                    client_id, fastie_client_name, is_active,
                    created_by, created_at, updated_by, updated_at
                ) VALUES(:cid, :alias, true, 'NFC_Team', now(), 'NFC_Team', now())
            """,
                "params": {"cid": client_id, "alias": alias},
            }
        )

    diff = {
        "group_name_changed": group_name_changed,
        "old_group_name": group_name if group_name_changed else None,
        "new_group_name": new_group_name if group_name_changed else None,
        "beids_added": [{"beid": b, "org_id": o} for b, o in beids_added],
        "beids_removed": [{"beid": b, "org_id": o} for b, o in beids_removed],
        "reports_added": list(reports_added),
        "reports_removed": list(reports_removed),
        "aliases_added": list(aliases_added),
        "aliases_removed": list(aliases_removed),
    }

    return {"statements": statements, "diff": diff}
