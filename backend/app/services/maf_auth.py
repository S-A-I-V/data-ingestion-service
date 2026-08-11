"""
MAF Authentication helpers — used by get_current_user dependency as a fallback
when the middleware hasn't populated request.state.

For the full middleware implementation, see app/middleware/maf_auth.py.
This module provides a simpler get_maf_user() for use in route-level dependencies.
"""

import logging
from dataclasses import dataclass

import jwt
from fastapi import HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class MAFUser:
    """Lightweight user object extracted from MAF JWT claims."""

    email: str
    name: str = ""
    first_name: str = ""
    last_name: str = ""
    source: str = "unknown"


def get_maf_user(request: Request) -> MAFUser:
    """
    Extract user identity from request. Same priority as middleware:
      1. JWT from Authorization header
      2. X-User-Email header (if allowed)
      3. MAF_DEV_EMAIL fallback (development only)
    """
    # 1. MAF JWT
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            email = payload.get("email") or payload.get("sub") or payload.get("preferred_username", "")
            if email:
                first_name = payload.get("firstName", "") or payload.get("given_name", "")
                last_name = payload.get("lastName", "") or payload.get("family_name", "")
                name = f"{first_name} {last_name}".strip() or payload.get("name", "")
                return MAFUser(
                    email=email.strip().lower(),
                    name=name,
                    first_name=first_name,
                    last_name=last_name,
                    source="jwt",
                )
        except Exception as e:
            logger.warning(f"MAF auth service: JWT decode error: {e}")

    # 2. X-User-Email header (impersonation)
    if settings.MAF_ALLOW_EMAIL_HEADER_FALLBACK:
        header_email = request.headers.get(settings.MAF_EMAIL_HEADER_NAME, "").strip().lower()
        if header_email:
            return MAFUser(email=header_email, name=header_email.split("@")[0], source="header")

    # 3. Dev fallback (ONLY in development)
    if settings.ENVIRONMENT == "development" and settings.MAF_DEV_EMAIL:
        fallback = settings.MAF_DEV_EMAIL.strip().lower()
        return MAFUser(email=fallback, name=fallback.split("@")[0], source="fallback")

    raise HTTPException(
        status_code=401,
        detail="Authentication required. No valid MAF JWT or fallback found.",
    )
