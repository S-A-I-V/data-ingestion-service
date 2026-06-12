"""
NFC Data Ingestion Service — FastAPI Application Entry Point.

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
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings, validate_production_config
from app.database import Base, engine
from app.logging_config import configure_logging
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.routers import ai, associate_lookup, audit, auth, client_onboarding, connections, ingestion, report_mapping

# ── 1. Configure Logging ─────────────────────────────────────────────────────
configure_logging(level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
logger = logging.getLogger(__name__)

# ── 2. Validate Configuration ────────────────────────────────────────────────
validate_production_config()

# ── 3. Create Tables ─────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── 4. Application Setup ─────────────────────────────────────────────────────
app = FastAPI(
    title="NFC Data Ingestion Service",
    version="2.0.0",
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
)

# Rate limiter
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middleware Stack (outermost first) ────────────────────────────────────────
# Order: Security Headers → Request Context → Session → CORS
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# ── 5. Routers ───────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(connections.router)
app.include_router(ingestion.router)
app.include_router(audit.router)
app.include_router(ai.router)
app.include_router(associate_lookup.router)
app.include_router(client_onboarding.router)
app.include_router(report_mapping.router)


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
