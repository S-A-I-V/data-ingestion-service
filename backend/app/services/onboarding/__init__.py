"""
Client Onboarding service layer.

Modules:
  - schemas:    Pydantic request/response models
  - queries:    SQL statement builders for atomic onboarding
  - connection: NFC Prod connection resolution
"""

from app.services.onboarding.connection import find_nfc_connection
from app.services.onboarding.queries import (
    build_edit_statements,
    build_onboarding_statements,
    check_duplicates,
    fetch_all_clients,
    fetch_client_details,
    fetch_next_ids,
    fetch_report_definitions,
    fetch_report_map,
)
from app.services.onboarding.schemas import EditClientRequest, OnboardRequest

__all__ = [
    "find_nfc_connection",
    "build_edit_statements",
    "build_onboarding_statements",
    "check_duplicates",
    "fetch_all_clients",
    "fetch_client_details",
    "fetch_next_ids",
    "fetch_report_definitions",
    "fetch_report_map",
    "EditClientRequest",
    "OnboardRequest",
]
