"""
NFC Prod connection resolver for the Report Health service.

Wraps the pattern used across all admin routers: find a saved DBConnection
record whose host/port/database matches the NFC_PROD_* config values,
then return a connector instance ready to execute queries.

Raises 404 if the user hasn't saved the NFC Prod connection yet, and 503
on any connectivity failure.
"""

import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.constants import NFC_PROD_DB, NFC_PROD_HOST, NFC_PROD_PORT
from app.models.connection import DBConnection
from app.services.db_connector import get_connector

logger = logging.getLogger(__name__)

_NFC_PROD_NOT_SAVED_MSG = (
    f"No saved NFC Prod connection found for "
    f"{NFC_PROD_HOST}:{NFC_PROD_PORT}/{NFC_PROD_DB}. "
    "Add it in Database Connections first."
)


def resolve_nfc_prod_connection(user_id: str, db: Session):
    """
    Find the user's saved NFC Prod connection record and return a connector.

    Args:
        user_id: The authenticated user's ID (used to scope the connection lookup).
        db: SQLAlchemy session on the ingestion_service DB.

    Returns:
        A db connector instance (supports execute_query / execute_transaction).

    Raises:
        HTTPException 404: NFC Prod connection not saved by this user.
        HTTPException 503: Connection found but unreachable.
    """
    saved_connection = (
        db.query(DBConnection)
        .filter(
            DBConnection.host == NFC_PROD_HOST,
            DBConnection.port == NFC_PROD_PORT,
            DBConnection.database == NFC_PROD_DB,
            DBConnection.created_by == user_id,
        )
        .first()
    )

    if not saved_connection:
        raise HTTPException(status_code=404, detail=_NFC_PROD_NOT_SAVED_MSG)

    return get_connector(saved_connection)


def resolve_nfc_prod_connection_with_record(user_id: str, db: Session) -> tuple:
    """
    Same as resolve_nfc_prod_connection but also returns the DBConnection record.
    Used when the caller needs to call mark_connection_active/failed.

    Returns:
        (connector, saved_connection: DBConnection)
    """
    saved_connection = (
        db.query(DBConnection)
        .filter(
            DBConnection.host == NFC_PROD_HOST,
            DBConnection.port == NFC_PROD_PORT,
            DBConnection.database == NFC_PROD_DB,
            DBConnection.created_by == user_id,
        )
        .first()
    )

    if not saved_connection:
        raise HTTPException(status_code=404, detail=_NFC_PROD_NOT_SAVED_MSG)

    connector = get_connector(saved_connection)
    return connector, saved_connection
