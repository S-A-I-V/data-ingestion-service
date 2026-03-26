from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class DBConnection(Base):
    __tablename__ = "db_connections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    db_type = Column(String, nullable=False)  # postgres, clickhouse, sybase, mysql, mssql
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    database = Column(String, nullable=False)
    username = Column(String, nullable=False)
    password = Column(String, nullable=True, default="")  # TODO: encrypt at rest

    # SSL / TLS
    use_ssl = Column(Boolean, default=False)

    # SSH Tunnel
    ssh_enabled = Column(Boolean, default=False)
    ssh_host = Column(String, nullable=True)
    ssh_port = Column(Integer, nullable=True, default=22)
    ssh_username = Column(String, nullable=True)
    ssh_password = Column(String, nullable=True)

    # Connection options
    connection_timeout = Column(Integer, default=30)  # seconds
    jdbc_url = Column(String, nullable=True)  # optional: connect by URL instead

    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
