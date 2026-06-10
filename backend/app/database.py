"""
Database engine and session configuration.

Pool settings are driven by config.py for environment-specific tuning:
  - Development: small pool (5), minimal overflow
  - Production: large pool (20+), generous overflow (50+)
"""

import logging

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
    echo=settings.ENVIRONMENT == "development" and settings.LOG_LEVEL == "DEBUG",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Pool event logging ────────────────────────────────────────────────────────


@event.listens_for(engine, "checkout")
def _on_checkout(dbapi_conn, connection_rec, connection_proxy):
    """Log when a connection is checked out from the pool."""
    logger.debug(
        "db_pool_checkout",
        extra={"pool_size": engine.pool.size(), "checked_out": engine.pool.checkedout()},
    )


@event.listens_for(engine, "checkin")
def _on_checkin(dbapi_conn, connection_rec):
    """Log when a connection is returned to the pool."""
    logger.debug(
        "db_pool_checkin",
        extra={"pool_size": engine.pool.size(), "checked_out": engine.pool.checkedout()},
    )


@event.listens_for(engine, "connect")
def _on_connect(dbapi_conn, connection_rec):
    """Log new physical connections."""
    logger.info("db_new_connection_created")


# ── Session dependency ────────────────────────────────────────────────────────


def get_db():
    """FastAPI dependency that provides a database session with proper cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
