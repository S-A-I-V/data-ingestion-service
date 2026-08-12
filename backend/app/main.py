"""
NFC Admin Portal — FastAPI Application Entry Point.

Startup sequence:
  1. Configure structured logging
  2. Validate production configuration
  3. Create database tables
  4. Register middleware stack (order matters)
  5. Mount routers
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings, validate_production_config
from app.logging_config import configure_logging
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.routers import (
    ai,
    associate_lookup,
    audit,
    auth,
    client_onboarding,
    connections,
    email_discrepancy,
    ingestion,
    job_onboarding,
    job_sla,
    rbac_admin,
    report_health,
    report_mapping,
    report_policies,
)

# ── 1. Configure Logging ─────────────────────────────────────────────────────
configure_logging(level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
logger = logging.getLogger(__name__)

# ── 2. Validate Configuration ────────────────────────────────────────────────
validate_production_config()

# ── 3. Schema managed by Liquibase ────────────────────────────────────────────
# Tables are created via Liquibase changesets (backend/db/).
# Do NOT use Base.metadata.create_all() — Liquibase owns the DDL.

# ── 4. Application Setup ─────────────────────────────────────────────────────
app = FastAPI(
    title="NFC Admin Portal",
    version="2.0.0",
    redirect_slashes=False,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
)

# Rate limiter
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middleware Stack (outermost first) ────────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)


class MAFPathStripMiddleware(BaseHTTPMiddleware):
    """Strip the /nfc-admin prefix that MAF gateway prepends to forwarded requests."""

    APP_PREFIX = "/nfc-admin"

    async def dispatch(self, request, call_next):
        path = request.scope.get("path", "")
        if path.startswith(self.APP_PREFIX + "/"):
            request.scope["path"] = path[len(self.APP_PREFIX) :]
        return await call_next(request)


# MAF Auth middleware
if settings.AUTH_MODE == "maf":
    from app.middleware.maf_auth import MAFAuthMiddleware

    app.add_middleware(MAFAuthMiddleware)

app.add_middleware(RequestContextMiddleware)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:6100", "https://localhost:6100"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Path strip MUST be outermost (added last = runs first in Starlette LIFO order)
app.add_middleware(MAFPathStripMiddleware)

# ── 5. Routers ───────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(connections.router)
app.include_router(ingestion.router)
app.include_router(audit.router)
app.include_router(ai.router)
app.include_router(associate_lookup.router)
app.include_router(client_onboarding.router)
app.include_router(job_onboarding.router)
app.include_router(report_mapping.router)
app.include_router(email_discrepancy.router)
app.include_router(report_health.router)
app.include_router(report_policies.router)
app.include_router(rbac_admin.router)
app.include_router(job_sla.router)


# ── Health Check ──────────────────────────────────────────────────────────────


@app.get("/api/health")
def health():
    """Health check endpoint for load balancers and monitoring."""
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "version": "2.0.0",
    }


# ── Startup Event ────────────────────────────────────────────────────────────


@app.on_event("startup")
async def startup_event():
    logger.info(
        "application_started",
        extra={
            "environment": settings.ENVIRONMENT,
            "log_level": settings.LOG_LEVEL,
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
        },
    )


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("application_shutting_down")
