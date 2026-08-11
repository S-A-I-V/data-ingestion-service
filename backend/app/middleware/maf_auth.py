"""
MAF Authentication & Authorization Middleware.

Mirrors the NFC Java ApiUserContext pattern:
  1. JWT from Authorization header (MAF gateway injects this)
  2. X-User-Email header override (for impersonation/testing — configurable)
  3. Fallback email from env (local dev only — MUST be empty in deployed envs)

Config (via .env / environment variables):
  AUTH_MODE=maf                           — enables this middleware
  MAF_ALLOW_EMAIL_HEADER_FALLBACK=true    — allow X-User-Email header override
  MAF_EMAIL_HEADER_NAME=X-User-Email      — header name for override
  MAF_INTERNAL_EMAIL_DOMAIN=@nielsen.com  — domain check for internal users
  MAF_DEV_EMAIL=user@nielsen.com          — dev-only fallback (empty in prod!)

Request flow:
  1. Decode MAF JWT → extract email (primary, always tried first)
  2. If no JWT: check X-User-Email header (if allowed by config)
  3. If nothing: use MAF_DEV_EMAIL (only in development mode)
  4. If still nothing: 401

After resolution, attaches to request.state:
  - user_email: str
  - user_id: str
  - user_name: str
  - user_permissions: list[str]
  - user_is_internal: bool
  - user_authenticated_via: str ("jwt" | "header" | "fallback")
  - user: User (SQLAlchemy model)
"""

import logging
import secrets as _secrets
from dataclasses import dataclass
from typing import Optional

import jwt as pyjwt
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings
from app.database import SessionLocal
from app.middleware.request_context import request_user_var
from app.models.user import User

logger = logging.getLogger(__name__)

# Paths that don't require authentication
EXCLUDED_PATHS = frozenset(
    {
        "/api/health",
        "/api/docs",
        "/api/redoc",
        "/api/openapi.json",
    }
)

EXCLUDED_PREFIXES = ("/api/docs", "/api/redoc")


@dataclass
class ResolvedUser:
    """Result of user resolution from request."""

    email: str
    user_id: Optional[str] = None
    is_internal: bool = False
    authenticated: bool = False
    source: str = "unknown"  # "jwt" | "header" | "fallback"


def _resolve_from_jwt(request: Request) -> Optional[ResolvedUser]:
    """Try to resolve user from MAF JWT in Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]
    try:
        # Decode without signature verification — MAF gateway already validated.
        payload = pyjwt.decode(token, options={"verify_signature": False})

        # MAF JWT fields: email, sub, preferred_username, firstName, lastName, id, user_id
        email = payload.get("email") or payload.get("sub") or payload.get("preferred_username")
        if not email:
            return None

        email = email.strip().lower()
        user_id = str(payload.get("user_id") or payload.get("id") or "")
        is_internal = email.endswith(settings.MAF_INTERNAL_EMAIL_DOMAIN)

        return ResolvedUser(
            email=email,
            user_id=user_id or None,
            is_internal=is_internal,
            authenticated=True,
            source="jwt",
        )
    except pyjwt.exceptions.DecodeError:
        logger.warning("MAF auth: failed to decode JWT from Authorization header")
    except Exception as e:
        logger.warning(f"MAF auth: JWT decode error: {e}")
    return None


def _resolve_from_header(request: Request) -> Optional[ResolvedUser]:
    """Try to resolve user from X-User-Email header (impersonation/override)."""
    if not settings.MAF_ALLOW_EMAIL_HEADER_FALLBACK:
        return None

    email = request.headers.get(settings.MAF_EMAIL_HEADER_NAME, "").strip().lower()
    if not email:
        return None

    is_internal = email.endswith(settings.MAF_INTERNAL_EMAIL_DOMAIN)
    return ResolvedUser(
        email=email,
        is_internal=is_internal,
        authenticated=False,
        source="header",
    )


def _resolve_from_fallback() -> Optional[ResolvedUser]:
    """Use fallback email from env — ONLY in development mode."""
    if settings.ENVIRONMENT != "development":
        return None

    fallback = (settings.MAF_DEV_EMAIL or "").strip().lower()
    if not fallback:
        return None

    is_internal = fallback.endswith(settings.MAF_INTERNAL_EMAIL_DOMAIN)
    return ResolvedUser(
        email=fallback,
        is_internal=is_internal,
        authenticated=False,
        source="fallback",
    )


def _get_or_create_user(email: str, db: Session) -> User:
    """Look up user by email. Auto-create if not found (first-time MAF user)."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            id=_secrets.token_hex(16),
            email=email,
            name=email.split("@")[0],
            picture="",
            email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"MAF auth: auto-created user for email={email}")
    return user


def _get_user_permissions(user_id: str, db: Session) -> list[str]:
    """Fetch all permission codes for a user via their roles."""
    from app.models.rbac import Permission, role_permissions, user_roles

    rows = (
        db.query(Permission.code)
        .join(role_permissions, role_permissions.c.permission_id == Permission.id)
        .join(user_roles, user_roles.c.role_id == role_permissions.c.role_id)
        .filter(user_roles.c.user_id == user_id)
        .all()
    )
    return [row.code for row in rows]


class MAFAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware that authenticates every /api/* request via MAF JWT.

    Resolution order (same as NFC's ApiUserContext):
      1. JWT from Authorization header
      2. X-User-Email header (if allowed)
      3. Fallback email from env (dev only)
      4. 401 Unauthorized

    After resolution, attaches user context to request.state.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Skip auth for excluded paths
        if path in EXCLUDED_PATHS or path.startswith(EXCLUDED_PREFIXES):
            return await call_next(request)

        # Skip auth for non-API paths
        if not path.startswith("/api"):
            return await call_next(request)

        # Skip if AUTH_MODE is not "maf"
        if settings.AUTH_MODE != "maf":
            return await call_next(request)

        # Resolve user: JWT → Header → Fallback
        resolved = _resolve_from_jwt(request) or _resolve_from_header(request) or _resolve_from_fallback()

        if not resolved:
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Authentication required. No valid MAF JWT, "
                    "X-User-Email header, or dev fallback found."
                },
            )

        # Look up user + permissions from DB
        db: Session = SessionLocal()
        try:
            user = _get_or_create_user(resolved.email, db)
            permissions = _get_user_permissions(user.id, db)

            # Attach to request.state
            request.state.user_email = user.email
            request.state.user_id = user.id
            request.state.user_name = user.name
            request.state.user_permissions = permissions
            request.state.user_is_internal = resolved.is_internal
            request.state.user_authenticated_via = resolved.source
            request.state.user = user
            request.state.db = db

            # Update ContextVar for structured logging
            request_user_var.set(user.email)

            logger.debug(
                f"MAF auth: resolved user={user.email} via={resolved.source} "
                f"internal={resolved.is_internal} perms={len(permissions)}"
            )

            response = await call_next(request)
            return response
        except Exception:
            db.close()
            raise
        finally:
            db.close()
