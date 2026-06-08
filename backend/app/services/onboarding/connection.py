"""
NFC Prod connection resolution for client onboarding.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.constants import NFC_PROD_DB, NFC_PROD_HOST, NFC_PROD_PORT
from app.models.connection import DBConnection


def find_nfc_connection(user_id: str, db: Session) -> DBConnection:
    """Find the saved connection matching the NFC Prod target."""
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
                f"No saved connection found for "
                f"{NFC_PROD_HOST}:{NFC_PROD_PORT}/{NFC_PROD_DB}. "
                "Please add it in Database Connections first."
            ),
        )
    return conn
