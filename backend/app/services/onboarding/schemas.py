"""
Pydantic schemas for client onboarding requests.
"""

from pydantic import BaseModel, field_validator


class ClientDetails(BaseModel):
    client_name: str

    @field_validator("client_name")
    @classmethod
    def validate_client_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Client name cannot be empty")
        if len(v) > 200:
            raise ValueError("Client name must be under 200 characters")
        return v


class GroupDetails(BaseModel):
    group_name: str

    @field_validator("group_name")
    @classmethod
    def validate_group_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Group name cannot be empty")
        if len(v) > 200:
            raise ValueError("Group name must be under 200 characters")
        return v


class BeidMapping(BaseModel):
    business_entity_ids: list[int]
    org_id: str

    @field_validator("business_entity_ids")
    @classmethod
    def validate_beids(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("At least one Business Entity ID is required")
        if len(v) > 500:
            raise ValueError("Maximum 500 BEIDs per onboarding")
        for beid in v:
            if beid <= 0:
                raise ValueError(f"Invalid BEID: {beid} — must be a positive integer")
        return v

    @field_validator("org_id")
    @classmethod
    def validate_org_id(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Org ID cannot be empty")
        if len(v) > 100:
            raise ValueError("Org ID must be under 100 characters")
        return v


class ReportSelection(BaseModel):
    report_ids: list[int]

    @field_validator("report_ids")
    @classmethod
    def validate_report_ids(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("At least one report must be selected")
        return v


class OnboardRequest(BaseModel):
    """Complete onboarding payload — all steps combined for atomic insert."""

    client_name: str
    group_name: str
    beid_org_mappings: list[dict]
    report_ids: list[int]
    fastie_aliases: list[str] = []

    @field_validator("client_name", "group_name")
    @classmethod
    def validate_names(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if len(v) > 200:
            raise ValueError("Name must be under 200 characters")
        return v

    @field_validator("beid_org_mappings")
    @classmethod
    def validate_beid_org(cls, v: list[dict]) -> list[dict]:
        if not v:
            raise ValueError("At least one BEID mapping is required")
        for item in v:
            beid = item.get("beid")
            org_id = item.get("org_id", "").strip()
            if not beid or beid <= 0:
                raise ValueError(f"Invalid BEID: {beid}")
            if not org_id:
                raise ValueError(f"Org ID is required for BEID {beid}")
        return v

    @field_validator("report_ids")
    @classmethod
    def validate_report_ids(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("At least one report must be selected")
        return v
