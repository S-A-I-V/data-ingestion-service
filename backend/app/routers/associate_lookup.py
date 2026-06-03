"""
Associate Lookup — Admin-only tool.

Queries the Sybase REDACTED_DB database for associate/business entity
data by businessEntityID. Requires 'admin:associate_lookup' permission.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.connection import DBConnection
from app.models.user import User
from app.routers.auth import limiter
from app.services.db_connector import get_connector
from app.services.rbac import require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/associate-lookup", tags=["admin"])

# The fixed connection target for this feature
LOOKUP_HOST = "REDACTED_HOST"
LOOKUP_PORT = 2125
LOOKUP_DB = "REDACTED_DB"

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
"""


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
    beid: Optional[int] = Query(None, description="Business Entity ID"),
    dmzid: Optional[str] = Query(None, description="DMZID (email)"),
    user: User = Depends(require_permission("admin:associate_lookup")),
    db: Session = Depends(get_db),
):
    """
    Query associates by businessEntityID or DMZID (email) from REDACTED_DB.
    Provide either beid or dmzid.
    """
    if not beid and not dmzid:
        raise HTTPException(status_code=400, detail="Provide either 'beid' or 'dmzid' parameter")

    conn = _find_lookup_connection(user.id, db)
    connector = get_connector(conn)

    try:
        if dmzid:
            results = connector.execute_query(ASSOCIATE_QUERY_BY_DMZID, {"dmzid": dmzid.strip()})
        else:
            results = connector.execute_query(ASSOCIATE_QUERY_BY_BEID, {"beid": beid})
    except Exception as e:
        logger.error(f"Associate lookup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}") from e

    if not results:
        return {"columns": [], "rows": [], "total": 0}

    columns = list(results[0].keys()) if results else []
    rows = [list(row.values()) for row in results]

    return {
        "columns": columns,
        "rows": rows,
        "total": len(rows),
    }
