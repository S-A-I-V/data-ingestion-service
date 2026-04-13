from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, event
from sqlalchemy.sql import func

from app.database import Base


class DBConnection(Base):
    __tablename__ = "db_connections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    db_type = Column(String, nullable=False)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    database = Column(String, nullable=False)
    username = Column(String, nullable=False)
    password_encrypted = Column("password", String, nullable=True, default="")

    # SSL / TLS
    use_ssl = Column(Boolean, default=False)

    # SSH Tunnel
    ssh_enabled = Column(Boolean, default=False)
    ssh_host = Column(String, nullable=True)
    ssh_port = Column(Integer, nullable=True, default=22)
    ssh_username = Column(String, nullable=True)
    ssh_password_encrypted = Column("ssh_password", String, nullable=True)

    # Connection options
    connection_timeout = Column(Integer, default=30)
    jdbc_url = Column(String, nullable=True)

    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def password(self) -> str:
        from app.services.crypto import decrypt
        try:
            return decrypt(self.password_encrypted or "")
        except Exception:
            return self.password_encrypted or ""  # Fallback for unencrypted legacy data

    @password.setter
    def password(self, value: str):
        from app.services.crypto import encrypt
        self.password_encrypted = encrypt(value) if value else ""

    @property
    def ssh_password(self) -> str:
        from app.services.crypto import decrypt
        try:
            return decrypt(self.ssh_password_encrypted or "")
        except Exception:
            return self.ssh_password_encrypted or ""

    @ssh_password.setter
    def ssh_password(self, value: str):
        from app.services.crypto import encrypt
        self.ssh_password_encrypted = encrypt(value) if value else ""
