"""
Associate Lookup — Admin-only tool.

Queries the Sybase REDACTED_DB database for associate/business entity
data by businessEntityID. Requires 'admin:associate_lookup' permission.
"""

import logging
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.constants import LOOKUP_DB, LOOKUP_HOST, LOOKUP_PORT
from app.database import get_db
from app.models.connection import DBConnection
from app.models.user import User
from app.routers.auth import limiter
from app.services.connectors.specialty import SybaseConnectionError
from app.services.db_connector import get_connector
from app.services.rbac import require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/associate-lookup", tags=["admin"])

ASSOCIATE_QUERY_BY_BEID = """
SELECT
    a.associateID,
    a.businessEntityID,
    a.associateRoleTypeCode,
    a.firstName,
    a.middleInitial,
    a.lastName,
    a.jobTitle,
    a.DMZID,
    a.legacyDMZID,
    a.isDisabledFlag,
    a.lastUpdateDateTime AS associateLastUpdateDateTime,
    a.lastUpdatedBy,
    a.certificateDownloadDateTime,
    a.versionID,
    a.isDMZUserFlag,
    a.accountStartDate,
    a.accountEndDate,
    a.isCertUser,
    a.answersUID AS associateAnswersUID,
    a.externalClientRole,
    b.businessEntityTypeCode,
    b.name AS businessEntityName,
    b.companyNumber,
    b.locationCode,
    b.internalExternalTypeCode,
    b.addressLine1,
    b.addressLine2,
    b.city,
    b.stateOrProvince,
    b.zipCode,
    b.country,
    b.phoneNumber,
    b.lastUpdateDateTime AS businessEntityLastUpdateDateTime,
    b.status AS businessEntityStatus,
    b.answersUID AS businessEntityAnswersUID
FROM REDACTED_DB.dbo.Associate a
INNER JOIN REDACTED_DB.dbo.BusinessEntity b
    ON a.businessEntityID = b.businessEntityID
WHERE a.businessEntityID = :beid
    AND a.isDisabledFlag != '1'
"""

ASSOCIATE_QUERY_BY_DMZID = """
SELECT
    a.associateID,
    a.businessEntityID,
    a.associateRoleTypeCode,
    a.firstName,
    a.middleInitial,
    a.lastName,
    a.jobTitle,
    a.DMZID,
    a.legacyDMZID,
    a.isDisabledFlag,
    a.lastUpdateDateTime AS associateLastUpdateDateTime,
    a.lastUpdatedBy,
    a.certificateDownloadDateTime,
    a.versionID,
    a.isDMZUserFlag,
    a.accountStartDate,
    a.accountEndDate,
    a.isCertUser,
    a.answersUID AS associateAnswersUID,
    a.externalClientRole,
    b.businessEntityTypeCode,
    b.name AS businessEntityName,
    b.companyNumber,
    b.locationCode,
    b.internalExternalTypeCode,
    b.addressLine1,
    b.addressLine2,
    b.city,
    b.stateOrProvince,
    b.zipCode,
    b.country,
    b.phoneNumber,
    b.lastUpdateDateTime AS businessEntityLastUpdateDateTime,
    b.status AS businessEntityStatus,
    b.answersUID AS businessEntityAnswersUID
FROM REDACTED_DB.dbo.Associate a
INNER JOIN REDACTED_DB.dbo.BusinessEntity b
    ON a.businessEntityID = b.businessEntityID
WHERE a.DMZID = :dmzid
    AND a.isDisabledFlag != '1'
"""

# ── Input Validation ─────────────────────────────────────────────────────────

# RFC 5322 compliant email regex (simplified but strict)
_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
)

# Max lengths to prevent abuse
_MAX_EMAIL_LENGTH = 254  # RFC 5321 max
_MAX_BEID = 2_147_483_647  # 32-bit int max


_MAX_BEIDS_COUNT = 50  # Max number of BEIDs per request


def _validate_beid(beid: int) -> None:
    """Validate business entity ID is a positive integer within range."""
    if beid <= 0:
        raise HTTPException(status_code=400, detail="BEID must be a positive integer")
    if beid > _MAX_BEID:
        raise HTTPException(status_code=400, detail="BEID value is out of range")


def _parse_beids(raw: str) -> list[int]:
    """
    Parse a comma-separated string of BEIDs into a validated list of integers.
    Strips spaces, ignores empty segments.
    """
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if not parts:
        raise HTTPException(status_code=400, detail="No valid BEIDs provided")
    if len(parts) > _MAX_BEIDS_COUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Too many BEIDs — maximum {_MAX_BEIDS_COUNT} per request",
        )
    beids: list[int] = []
    for p in parts:
        try:
            val = int(p)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid BEID value: '{p}'") from exc
        _validate_beid(val)
        beids.append(val)
    return beids


def _validate_dmzid(dmzid: str) -> str:
    """
    Validate and sanitize DMZID (email) input.
    Guards against: SQL injection (redundant — params are bound), null bytes,
    unicode homoglyph attacks, oversized input, and malformed emails.
    """
    # Strip whitespace
    dmzid = dmzid.strip()

    # Reject empty
    if not dmzid:
        raise HTTPException(status_code=400, detail="DMZID/email cannot be empty")

    # Reject oversized input (DoS prevention)
    if len(dmzid) > _MAX_EMAIL_LENGTH:
        raise HTTPException(status_code=400, detail="Email exceeds maximum length (254 chars)")

    # Reject null bytes (injection vector)
    if "\x00" in dmzid:
        raise HTTPException(status_code=400, detail="Invalid characters in email")

    # Reject non-ASCII (homoglyph/punycode attacks) — DMZID emails are ASCII only
    if not dmzid.isascii():
        raise HTTPException(status_code=400, detail="Email must contain only ASCII characters")

    # Validate email format
    if not _EMAIL_RE.match(dmzid):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Normalize to lowercase
    return dmzid.lower()


def _find_lookup_connection(user_id: str, db: Session) -> DBConnection:
    """Find the saved connection matching the lookup target."""
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
                f"No saved connection found for {LOOKUP_HOST}:{LOOKUP_PORT}/{LOOKUP_DB}. "
                "Please add it in Database Connections first."
            ),
        )
    return conn


@router.get("/")
@limiter.limit("30/minute")
def lookup_associates(
    request: Request,
    beid: Optional[str] = Query(None, description="Business Entity ID(s), comma-separated"),
    dmzid: Optional[str] = Query(None, description="DMZID (email)"),
    user: User = Depends(require_permission("admin:associate_lookup")),
    db: Session = Depends(get_db),
):
    """
    Query associates by businessEntityID(s) or DMZID (email) from REDACTED_DB.
    Provide either beid (comma-separated for multiple) or dmzid.
    """
    if not beid and not dmzid:
        raise HTTPException(status_code=400, detail="Provide either 'beid' or 'dmzid' parameter")

    # Validate inputs
    beids: list[int] = []
    if beid:
        beids = _parse_beids(beid)
    if dmzid:
        dmzid = _validate_dmzid(dmzid)

    conn = _find_lookup_connection(user.id, db)
    connector = get_connector(conn)

    try:
        if dmzid:
            results = connector.execute_query(ASSOCIATE_QUERY_BY_DMZID, {"dmzid": dmzid})
        else:
            # Build dynamic IN clause for multiple BEIDs
            placeholders = ", ".join([f":beid{i}" for i in range(len(beids))])
            query = ASSOCIATE_QUERY_BY_BEID.replace(
                "a.businessEntityID = :beid",
                f"a.businessEntityID IN ({placeholders})",
            )
            params = {f"beid{i}": v for i, v in enumerate(beids)}
            results = connector.execute_query(query, params)
    except SybaseConnectionError as e:
        logger.error(f"Associate lookup connection error [{e.error_type}]: {e}")
        # Map error types to appropriate HTTP status codes and user-friendly messages
        status_map = {
            "connection_refused": 503,
            "network_unreachable": 503,
            "timeout": 504,
            "auth_failed": 502,
            "driver_error": 500,
            "connection_error": 503,
        }
        status_code = status_map.get(e.error_type, 503)
        raise HTTPException(status_code=status_code, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Associate lookup query failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while querying the database. Please try again.",
        ) from e

    if not results:
        search_field = "DMZID" if dmzid else "Business Entity ID(s)"
        search_value = dmzid if dmzid else ", ".join(str(b) for b in beids)
        return {
            "columns": [],
            "rows": [],
            "total": 0,
            "message": f"No associate found with {search_field}: {search_value}",
        }

    columns = list(results[0].keys()) if results else []
    rows = [list(row.values()) for row in results]

    return {
        "columns": columns,
        "rows": rows,
        "total": len(rows),
    }
