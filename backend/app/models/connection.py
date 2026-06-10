"""
Database connection model — stores encrypted credentials for target databases.

Security notes:
  - Passwords are AES-256-GCM encrypted at rest
  - Decryption failures are logged (not silently swallowed)
  - Legacy unencrypted data triggers a warning for migration
"""

import logging

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.sql import func

from app.database import Base

logger = logging.getLogger(__name__)


class DBConnection(Base):
    __tablename__ = "db_connections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    db_type = Column(String(50), nullable=False, index=True)
    host = Column(String(500), nullable=False)
    port = Column(Integer, nullable=False)
    database = Column(String(200), nullable=False)
    username = Column(String(200), nullable=False)
    password_encrypted = Column("password", String, nullable=True, default="")

    # SSL / TLS
    use_ssl = Column(Boolean, default=False)

    # SSH Tunnel
    ssh_enabled = Column(Boolean, default=False)
    ssh_host = Column(String(500), nullable=True)
    ssh_port = Column(Integer, nullable=True, default=22)
    ssh_username = Column(String(200), nullable=True)
    ssh_password_encrypted = Column("ssh_password", String, nullable=True)

    # Connection options
    connection_timeout = Column(Integer, default=30)
    jdbc_url = Column(String, nullable=True)

    # Last test result — persisted so the UI survives page refreshes
    last_tested_at = Column(DateTime(timezone=True), nullable=True, default=None)
    last_test_ok = Column(Boolean, nullable=True, default=None)

    created_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ── Composite Index ───────────────────────────────────────────────────────
    __table_args__ = (Index("idx_conn_user_type", "created_by", "db_type"),)

    @property
    def password(self) -> str:
        from app.services.crypto import decrypt

        if not self.password_encrypted:
            return ""
        try:
            return decrypt(self.password_encrypted)
        except Exception as e:
            # Log the failure instead of silently returning garbage
            logger.error(
                "password_decryption_failed",
                extra={"connection_id": self.id, "error": str(e)},
            )
            # Return empty string — caller should handle connection failure gracefully
            return ""

    @password.setter
    def password(self, value: str):
        from app.services.crypto import encrypt

        self.password_encrypted = encrypt(value) if value else ""

    @property
    def ssh_password(self) -> str:
        from app.services.crypto import decrypt

        if not self.ssh_password_encrypted:
            return ""
        try:
            return decrypt(self.ssh_password_encrypted)
        except Exception as e:
            logger.error(
                "ssh_password_decryption_failed",
                extra={"connection_id": self.id, "error": str(e)},
            )
            return ""

    @ssh_password.setter
    def ssh_password(self, value: str):
        from app.services.crypto import encrypt

        self.ssh_password_encrypted = encrypt(value) if value else ""
