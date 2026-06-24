"""
Email Discrepancy Audit — Admin-only tool.

Starts from the NFC Prod users table (source of truth for onboarded users),
then queries CPR for only those associate IDs to compare emails:
  1. NFC Prod public.users — our onboarded users with their current email
  2. REDACTED_DB.dbo.Associate — DMZID (originally onboarded email)
  3. REDACTED_DB.dbo.AssociateEmailAccount — actual current CPR email

Identifies:
  - NFC users whose email differs from their current CPR email (mismatch)
  - NFC users whose associate_id doesn't exist in CPR (data integrity issue)

Provides a batch-update flow with preview + confirmation.

Requires 'admin:email_discrepancy_audit' permission.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.constants import LOOKUP_DB, LOOKUP_HOST, LOOKUP_PORT, NFC_PROD_DB, NFC_PROD_HOST, NFC_PROD_PORT
from app.database import get_db
from app.models.audit import AuditLog
from app.models.connection import DBConnection
from app.models.user import User
from app.routers.auth import limiter
from app.services.connection_status import mark_connection_active, mark_connection_failed
from app.services.connectors.specialty import SybaseConnectionError
from app.services.db_connector import get_connector
from app.services.metrics import refresh_metrics_view
from app.services.rbac import require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/email-discrepancy", tags=["admin"])

# ══════════════════════════════════════════════════════════════════════════════
# SQL Queries
# ══════════════════════════════════════════════════════════════════════════════

# Fetches all users currently onboarded in NFC Prod — this is the SOURCE OF TRUTH
# Only associate IDs present here will be checked against CPR.
NFC_USERS_QUERY = """
SELECT
    associate_id,
    business_entity_id,
    first_name,
    last_name,
    email,
    created_at,
    updated_at
FROM public.users
"""

# Fetches DMZID for specific associate IDs from CPR Associate table
# Dynamically built with IN clause for the associate IDs found in NFC users
CPR_ASSOCIATE_BY_IDS_TEMPLATE = """
SELECT
    a.associateID,
    a.businessEntityID,
    a.firstName,
    a.lastName,
    a.DMZID
FROM REDACTED_DB.dbo.Associate a
WHERE a.associateID IN ({placeholders})
"""

# Fetches current email addresses for specific associate IDs from CPR
CPR_EMAILS_BY_IDS_TEMPLATE = """
SELECT
    ae.associateID,
    ae.emailAddress,
    ae.emailTypeCode,
    ae.sequenceNumber
FROM REDACTED_DB.dbo.AssociateEmailAccount ae
WHERE ae.associateID IN ({placeholders})
"""

# Update a single user's email in NFC Prod
NFC_UPDATE_EMAIL_QUERY = """
UPDATE public.users
SET email = :new_email, updated_at = NOW(), updated_by = :updated_by
WHERE associate_id = :associate_id AND business_entity_id = :business_entity_id
"""


# ══════════════════════════════════════════════════════════════════════════════
# Request / Response Models
# ══════════════════════════════════════════════════════════════════════════════


class EmailFixItem(BaseModel):
    """A single email correction to apply."""

    associate_id: int
    business_entity_id: int
    current_nfc_email: str
    correct_email: str

    @field_validator("correct_email")
    @classmethod
    def validate_correct_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not v or "@" not in v:
            raise ValueError("Invalid email address")
        if len(v) > 254:
            raise ValueError("Email exceeds maximum length")
        return v


class BatchEmailFixRequest(BaseModel):
    """Batch email correction request with preview confirmation."""

    fixes: list[EmailFixItem]
    confirmed: bool = False

    @field_validator("fixes")
    @classmethod
    def validate_fixes_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("No fixes provided")
        if len(v) > 1000:
            raise ValueError("Maximum 1000 fixes per batch")
        return v


# ══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ══════════════════════════════════════════════════════════════════════════════


def _find_cpr_connection(user_id: str, db: Session) -> DBConnection:
    """Find the saved Sybase CPR connection for this user."""
    conn = (
        db.query(DBConnection)
        .filter(
            DBConnection.host == LOOKUP_HOST,
            DBConnection.port == LOOKUP_PORT,
            DBConnection.database == LOOKUP_DB,
            DBConnection.created_by == user_id,
        )
        .first()
    )
    if not conn:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No saved CPR connection found for {LOOKUP_HOST}:{LOOKUP_PORT}/{LOOKUP_DB}. "
                "Please add it in Database Connections first."
            ),
        )
    return conn


def _find_nfc_connection(user_id: str, db: Session) -> DBConnection:
    """Find the saved NFC Prod PostgreSQL connection for this user."""
    conn = (
        db.query(DBConnection)
        .filter(
            DBConnection.host == NFC_PROD_HOST,
            DBConnection.port == NFC_PROD_PORT,
            DBConnection.database == NFC_PROD_DB,
            DBConnection.created_by == user_id,
        )
        .first()
    )
    if not conn:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No saved NFC Prod connection found for {NFC_PROD_HOST}:{NFC_PROD_PORT}/{NFC_PROD_DB}. "
                "Please add it in Database Connections first."
            ),
        )
    return conn


def _determine_primary_email_from_cpr(
    associate_emails: list[dict],
) -> dict[int, str]:
    """
    For each associateID, determine the 'primary' email from AssociateEmailAccount.

    Schema: emailTypeCode is a smallint, sequenceNumber is smallint.
    The unique index is (associateID, sequenceNumber) — sequenceNumber 1 is the
    primary/default email for that associate.

    Logic: pick the email with the lowest sequenceNumber for each associate.

    Returns: { associateID: primary_email_address }
    """
    # Group emails by associateID
    emails_by_associate: dict[int, list[dict]] = {}
    for row in associate_emails:
        aid = row["associateID"]
        if aid not in emails_by_associate:
            emails_by_associate[aid] = []
        emails_by_associate[aid].append(row)

    primary_email_map: dict[int, str] = {}
    for aid, emails in emails_by_associate.items():
        # emailTypeCode is a smallint — no "Primary" string exists.
        # The primary email is the one with the lowest sequenceNumber (1 = primary).
        emails.sort(key=lambda x: x.get("sequenceNumber") or 0)
        if emails:
            raw_email = emails[0].get("emailAddress")
            if raw_email:
                primary_email_map[aid] = str(raw_email).strip().lower()

    return primary_email_map


def _build_discrepancy_report(
    nfc_users: list[dict],
    cpr_associates_by_id: dict[int, dict],
    cpr_primary_emails: dict[int, str],
) -> dict:
    """
    Compare NFC users against CPR email data to identify discrepancies.

    Starting point is always NFC users table — we only check associate IDs
    that are already onboarded.

    Returns:
      - email_mismatches: NFC users whose email differs from CPR primary email
      - not_in_cpr: NFC users whose associate_id was not found in CPR (data integrity issue)
      - summary statistics
    """
    email_mismatches: list[dict] = []
    not_found_in_cpr: list[dict] = []

    for nfc_user in nfc_users:
        associate_id = nfc_user.get("associate_id")
        if associate_id is None:
            continue

        beid = nfc_user.get("business_entity_id")
        nfc_email = (nfc_user.get("email") or "").strip().lower()
        first_name = nfc_user.get("first_name", "")
        last_name = nfc_user.get("last_name", "")

        # Check if this associate exists in CPR
        cpr_associate = cpr_associates_by_id.get(associate_id)
        if cpr_associate is None:
            not_found_in_cpr.append(
                {
                    "associate_id": associate_id,
                    "business_entity_id": beid,
                    "first_name": first_name,
                    "last_name": last_name,
                    "nfc_email": nfc_email,
                }
            )
            continue

        dmzid = (cpr_associate.get("DMZID") or "").strip().lower()

        # The actual current email from AssociateEmailAccount
        cpr_current_email = cpr_primary_emails.get(associate_id, "")

        # Compare NFC email with the actual CPR primary email
        if cpr_current_email and nfc_email != cpr_current_email:
            email_mismatches.append(
                {
                    "associate_id": associate_id,
                    "business_entity_id": beid,
                    "first_name": first_name,
                    "last_name": last_name,
                    "dmzid": dmzid,
                    "cpr_current_email": cpr_current_email,
                    "nfc_email": nfc_email,
                    "nfc_updated_at": str(nfc_user.get("updated_at", "")),
                }
            )

    matched_in_cpr = len(nfc_users) - len(not_found_in_cpr)

    return {
        "email_mismatches": email_mismatches,
        "not_found_in_cpr": not_found_in_cpr,
        "summary": {
            "total_nfc_users": len(nfc_users),
            "matched_in_cpr": matched_in_cpr,
            "email_mismatches_count": len(email_mismatches),
            "not_found_in_cpr_count": len(not_found_in_cpr),
            "emails_in_sync_count": matched_in_cpr - len(email_mismatches),
        },
    }


# ══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/scan")
@limiter.limit("10/minute")
def scan_email_discrepancies(
    request: Request,
    user: User = Depends(require_permission("admin:email_discrepancy_audit")),
    db: Session = Depends(get_db),
):
    """
    Full scan: starts from NFC users table, extracts associate IDs, then queries
    CPR (Associate + AssociateEmailAccount) only for those IDs to find discrepancies.

    Returns:
      - email_mismatches: list of NFC users whose email != CPR current email
      - not_found_in_cpr: list of NFC users whose associate_id doesn't exist in CPR
      - summary: aggregate counts
    """
    # ── 1. Resolve connections ────────────────────────────────────────────────
    cpr_conn = _find_cpr_connection(user.id, db)
    nfc_conn = _find_nfc_connection(user.id, db)

    cpr_connector = get_connector(cpr_conn)
    nfc_connector = get_connector(nfc_conn)

    # ── 2. Query NFC Prod: users (source of truth) ────────────────────────────
    try:
        nfc_users = nfc_connector.execute_query(NFC_USERS_QUERY, {})
    except Exception as e:
        logger.error(f"NFC users query failed: {e}")
        mark_connection_failed(nfc_conn, db)
        raise HTTPException(status_code=500, detail="Failed to query NFC Prod users table") from e

    mark_connection_active(nfc_conn, db)

    if not nfc_users:
        return {
            "email_mismatches": [],
            "not_found_in_cpr": [],
            "summary": {
                "total_nfc_users": 0,
                "matched_in_cpr": 0,
                "email_mismatches_count": 0,
                "not_found_in_cpr_count": 0,
                "emails_in_sync_count": 0,
            },
        }

    # ── 3. Extract associate IDs from NFC users ───────────────────────────────
    nfc_associate_ids = [u["associate_id"] for u in nfc_users if u.get("associate_id") is not None]

    if not nfc_associate_ids:
        return {
            "email_mismatches": [],
            "not_found_in_cpr": [],
            "summary": {
                "total_nfc_users": len(nfc_users),
                "matched_in_cpr": 0,
                "email_mismatches_count": 0,
                "not_found_in_cpr_count": 0,
                "emails_in_sync_count": 0,
            },
        }

    # ── 4. Query CPR: Associates (only for NFC associate IDs) ─────────────────
    # Batch in chunks to avoid query size limits
    CHUNK_SIZE = 500
    all_cpr_associates: list[dict] = []
    all_cpr_emails: list[dict] = []

    for i in range(0, len(nfc_associate_ids), CHUNK_SIZE):
        chunk = nfc_associate_ids[i : i + CHUNK_SIZE]
        placeholders = ", ".join([f":aid{j}" for j in range(len(chunk))])
        params = {f"aid{j}": v for j, v in enumerate(chunk)}

        # Associates
        associate_query = CPR_ASSOCIATE_BY_IDS_TEMPLATE.format(placeholders=placeholders)
        try:
            chunk_associates = cpr_connector.execute_query(associate_query, params)
            all_cpr_associates.extend(chunk_associates)
        except SybaseConnectionError as e:
            logger.error(f"CPR Associate query failed [{e.error_type}]: {e}")
            mark_connection_failed(cpr_conn, db)
            raise HTTPException(status_code=503, detail=f"CPR connection error: {e}") from e
        except Exception as e:
            logger.error(f"CPR Associate query unexpected error: {e}")
            mark_connection_failed(cpr_conn, db)
            raise HTTPException(status_code=500, detail="Failed to query CPR Associate table") from e

        # Emails
        email_query = CPR_EMAILS_BY_IDS_TEMPLATE.format(placeholders=placeholders)
        try:
            chunk_emails = cpr_connector.execute_query(email_query, params)
            all_cpr_emails.extend(chunk_emails)
        except SybaseConnectionError as e:
            logger.error(f"CPR AssociateEmailAccount query failed [{e.error_type}]: {e}")
            mark_connection_failed(cpr_conn, db)
            raise HTTPException(status_code=503, detail=f"CPR connection error: {e}") from e
        except Exception as e:
            logger.error(f"CPR AssociateEmailAccount query unexpected error: {e}")
            mark_connection_failed(cpr_conn, db)
            raise HTTPException(status_code=500, detail="Failed to query CPR AssociateEmailAccount table") from e

    mark_connection_active(cpr_conn, db)

    # ── 5. Build lookup maps ──────────────────────────────────────────────────
    cpr_associates_by_id: dict[int, dict] = {a["associateID"]: a for a in all_cpr_associates}
    cpr_primary_emails = _determine_primary_email_from_cpr(all_cpr_emails)

    # ── 6. Compute discrepancies ──────────────────────────────────────────────
    report = _build_discrepancy_report(nfc_users, cpr_associates_by_id, cpr_primary_emails)

    return report


@router.post("/fix-emails")
@limiter.limit("5/minute")
def batch_fix_emails(
    request: Request,
    payload: BatchEmailFixRequest,
    user: User = Depends(require_permission("admin:email_discrepancy_audit")),
    db: Session = Depends(get_db),
):
    """
    Apply batch email corrections to NFC Prod users table.

    Two-phase flow:
      1. If confirmed=False → returns a preview of what will be changed (dry run)
      2. If confirmed=True → executes the updates

    Each fix updates a single row in public.users matched by associate_id + business_entity_id.
    """
    nfc_conn = _find_nfc_connection(user.id, db)
    nfc_connector = get_connector(nfc_conn)

    # ── Dry-run mode: validate all fixes can be applied ───────────────────────
    if not payload.confirmed:
        # Verify each target user exists in NFC
        verification_results: list[dict] = []
        for fix in payload.fixes:
            # Check user exists
            check_query = """
                SELECT associate_id, email
                FROM public.users
                WHERE associate_id = :associate_id
                  AND business_entity_id = :business_entity_id
            """
            try:
                existing = nfc_connector.execute_query(
                    check_query,
                    {
                        "associate_id": fix.associate_id,
                        "business_entity_id": fix.business_entity_id,
                    },
                )
            except Exception as e:
                logger.error(f"Verification query failed: {e}")
                mark_connection_failed(nfc_conn, db)
                raise HTTPException(status_code=500, detail="Failed to verify target users") from e

            if existing:
                actual_current_email = existing[0].get("email", "")
                verification_results.append(
                    {
                        "associate_id": fix.associate_id,
                        "business_entity_id": fix.business_entity_id,
                        "current_email_in_db": actual_current_email,
                        "new_email": fix.correct_email,
                        "status": "ready",
                        "email_matches_expected": (
                            actual_current_email.strip().lower() == fix.current_nfc_email.strip().lower()
                        ),
                    }
                )
            else:
                verification_results.append(
                    {
                        "associate_id": fix.associate_id,
                        "business_entity_id": fix.business_entity_id,
                        "current_email_in_db": None,
                        "new_email": fix.correct_email,
                        "status": "not_found",
                        "email_matches_expected": False,
                    }
                )

        mark_connection_active(nfc_conn, db)

        ready_count = sum(1 for r in verification_results if r["status"] == "ready")
        not_found_count = sum(1 for r in verification_results if r["status"] == "not_found")

        return {
            "mode": "preview",
            "total_fixes": len(payload.fixes),
            "ready_to_apply": ready_count,
            "not_found_in_nfc": not_found_count,
            "verification_results": verification_results,
        }

    # ── Execute mode: apply updates ───────────────────────────────────────────
    successful_updates: list[dict] = []
    failed_updates: list[dict] = []

    for fix in payload.fixes:
        try:
            # Use execute_transaction for write operations (execute_query is for SELECTs only)
            nfc_connector.execute_transaction(
                [
                    {
                        "sql": NFC_UPDATE_EMAIL_QUERY,
                        "params": {
                            "new_email": fix.correct_email,
                            "updated_by": user.email,
                            "associate_id": fix.associate_id,
                            "business_entity_id": fix.business_entity_id,
                        },
                    }
                ]
            )
            successful_updates.append(
                {
                    "associate_id": fix.associate_id,
                    "business_entity_id": fix.business_entity_id,
                    "old_email": fix.current_nfc_email,
                    "new_email": fix.correct_email,
                }
            )
        except Exception as e:
            error_detail = str(e)[:300]
            logger.error(
                f"Email update failed for associate_id={fix.associate_id}, "
                f"beid={fix.business_entity_id}: {error_detail}"
            )
            failed_updates.append(
                {
                    "associate_id": fix.associate_id,
                    "business_entity_id": fix.business_entity_id,
                    "old_email": fix.current_nfc_email,
                    "attempted_new_email": fix.correct_email,
                    "error": error_detail,
                }
            )

    mark_connection_active(nfc_conn, db)

    # ── Audit log ─────────────────────────────────────────────────────────────
    # Build detailed change manifest for full traceability

    change_manifest = {
        "operation": "EMAIL_DISCREPANCY_FIX",
        "total_attempted": len(payload.fixes),
        "successful_count": len(successful_updates),
        "failed_count": len(failed_updates),
        "changes": [
            {
                "associate_id": u["associate_id"],
                "business_entity_id": u["business_entity_id"],
                "old_email": u["old_email"],
                "new_email": u["new_email"],
            }
            for u in successful_updates
        ],
        "failures": [
            {
                "associate_id": f["associate_id"],
                "business_entity_id": f["business_entity_id"],
                "old_email": f.get("old_email", ""),
                "attempted_new_email": f.get("attempted_new_email", ""),
                "error": f["error"],
            }
            for f in failed_updates
        ],
    }

    query_preview = json.dumps(change_manifest, indent=None)

    audit_status = "success" if not failed_updates else "partial"
    if not successful_updates:
        audit_status = "failed"

    audit = AuditLog(
        user_id=user.id,
        user_email=user.email,
        connection_id=nfc_conn.id,
        connection_name=nfc_conn.name,
        operation="EMAIL_DISCREPANCY_FIX",
        table_name="public.users",
        row_count=len(payload.fixes),
        rows_inserted=len(successful_updates),
        rows_skipped=len(failed_updates),
        query_preview=query_preview,
        status=audit_status,
        error_message=(
            "; ".join(f"aid={f['associate_id']}: {f['error'][:100]}" for f in failed_updates)[:500]
            if failed_updates
            else None
        ),
    )
    last = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    audit.seal(last.record_hash if last else None)
    db.add(audit)
    db.commit()
    refresh_metrics_view(db)

    return {
        "mode": "executed",
        "total_fixes": len(payload.fixes),
        "successful": len(successful_updates),
        "failed": len(failed_updates),
        "successful_updates": successful_updates,
        "failed_updates": failed_updates,
    }
