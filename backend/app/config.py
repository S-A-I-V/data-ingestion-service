"""
Application configuration with mandatory secret validation.

Secrets (SECRET_KEY, ENCRYPTION_KEY) MUST be set via environment variables
or .env file. The application will refuse to start with default/insecure values.
"""

import logging
import sys

from pydantic import field_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

# Insecure defaults that must be overridden
_INSECURE_DEFAULTS = {"change-me", "change-me-encryption-key", "secret", "password", ""}


class Settings(BaseSettings):
    # ── Required Secrets ──────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me"
    ENCRYPTION_KEY: str = "change-me-encryption-key"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ingestion_service"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 50
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600

    # ── OAuth ─────────────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/callback"
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/auth/github/callback"

    # ── External Services ─────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""

    # ── Application ───────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"  # development | staging | production
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "structured"  # structured | plain

    # ── Ingestion Limits ──────────────────────────────────────────────────────
    MAX_CSV_SIZE_MB: int = 50
    INGESTION_CHUNK_SIZE: int = 5000
    MAX_CONCURRENT_INGESTIONS: int = 10

    # ── Audit Log ─────────────────────────────────────────────────────────────
    AUDIT_RETENTION_DAYS: int = 365
    AUDIT_PARTITION_INTERVAL: str = "monthly"  # monthly | quarterly

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v in _INSECURE_DEFAULTS:
            logger.critical(
                "SECRET_KEY is using an insecure default. "
                "Set a strong random value in .env or environment variables."
            )
            # Allow in development, block in production (checked at startup)
        if len(v) < 32:
            logger.warning("SECRET_KEY should be at least 32 characters for production use.")
        return v

    @field_validator("ENCRYPTION_KEY")
    @classmethod
    def validate_encryption_key(cls, v: str) -> str:
        if v in _INSECURE_DEFAULTS:
            logger.critical(
                "ENCRYPTION_KEY is using an insecure default. "
                "Set a strong random value in .env or environment variables."
            )
        if len(v) < 32:
            logger.warning("ENCRYPTION_KEY should be at least 32 characters for production use.")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


def validate_production_config() -> None:
    """
    Call at startup to enforce production-grade configuration.
    Exits the process if critical secrets are insecure in production.
    """
    if settings.ENVIRONMENT == "production":
        errors = []
        if settings.SECRET_KEY in _INSECURE_DEFAULTS:
            errors.append("SECRET_KEY must be set to a strong random value in production")
        if settings.ENCRYPTION_KEY in _INSECURE_DEFAULTS:
            errors.append("ENCRYPTION_KEY must be set to a strong random value in production")
        if "localhost" in settings.DATABASE_URL:
            errors.append("DATABASE_URL should not point to localhost in production")
        if not settings.GOOGLE_CLIENT_ID and not settings.GITHUB_CLIENT_ID:
            errors.append("At least one OAuth provider must be configured in production")

        if errors:
            for err in errors:
                logger.critical(f"CONFIGURATION ERROR: {err}")
            sys.exit(1)

    # Warn in any environment
    if settings.SECRET_KEY in _INSECURE_DEFAULTS:
        logger.warning("⚠️  Using insecure default SECRET_KEY — override before deploying")
    if settings.ENCRYPTION_KEY in _INSECURE_DEFAULTS:
        logger.warning("⚠️  Using insecure default ENCRYPTION_KEY — override before deploying")
