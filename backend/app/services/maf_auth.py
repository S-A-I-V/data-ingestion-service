"""
MAF Authentication — extract user identity from MAF gateway JWT.

When AUTH_MODE=maf, the MAF App Gateway injects a signed JWT (v3, RS256)
into the Authorization header for every request where force_user=true.

MAF JWT payload fields (relevant subset):
  - email: "user@nielsen.com"
  - firstName: "John"
  - lastName: "Doe"
  - middleName: "M"
  - id: 123
  - entityCode: 1212
  - tenantCode: 1
  - roles: [{...}, ...]
  - isActive: true
  - jobTitle: "..."

For local development without the full MAF gateway stack:
  - Set MAF_DEV_EMAIL in .env to bypass JWT verification and use a fixed email
  - Or pass X-Auth-Email header (only in development mode)
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


def get_maf_user(request: Request) -> MAFUser:
    """
    Extract user identity from MAF-injected JWT or dev fallbacks.

    Priority:
    1. Authorization: Bearer <JWT> — decode and extract email/name claims
    2. X-Auth-Email header (development only) — trust directly
    3. MAF_DEV_EMAIL env var (development only) — fixed fallback
    """
    # Try Authorization header (MAF gateway injects this)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            # Decode without signature verification — MAF gateway is trusted infrastructure.
            # In production with external exposure, verify against MAF JWKS endpoint.
            payload = jwt.decode(token, options={"verify_signature": False})

            # MAF token fields: email, firstName, lastName, middleName, id, roles, etc.
            email = payload.get("email") or payload.get("sub") or payload.get("preferred_username", "")
            first_name = payload.get("firstName", "") or payload.get("given_name", "")
            last_name = payload.get("lastName", "") or payload.get("family_name", "")
            name = f"{first_name} {last_name}".strip() or payload.get("name", "")

            if email:
                logger.debug(f"MAF auth: extracted email={email}, name={name} from JWT")
                return MAFUser(
                    email=email,
                    name=name,
                    first_name=first_name,
                    last_name=last_name,
                )
        except jwt.exceptions.DecodeError:
            logger.warning("MAF auth: failed to decode JWT from Authorization header")
        except Exception as e:
            logger.warning(f"MAF auth: JWT decode error: {e}")

    # Dev fallback: X-Auth-Email header (only in development)
    if settings.ENVIRONMENT == "development":
        dev_email = request.headers.get("X-Auth-Email", "")
        if dev_email:
            logger.debug(f"MAF auth: using X-Auth-Email header: {dev_email}")
            return MAFUser(email=dev_email, name=dev_email.split("@")[0])

        # Dev fallback: fixed email from env
        if settings.MAF_DEV_EMAIL:
            logger.debug(f"MAF auth: using MAF_DEV_EMAIL fallback: {settings.MAF_DEV_EMAIL}")
            return MAFUser(email=settings.MAF_DEV_EMAIL, name=settings.MAF_DEV_EMAIL.split("@")[0])

    raise HTTPException(
        status_code=401,
        detail="Authentication required. No valid MAF JWT or dev fallback found.",
    )
