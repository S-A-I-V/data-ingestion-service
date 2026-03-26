from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    user_email = Column(String, nullable=False)
    connection_id = Column(Integer, ForeignKey("db_connections.id"), nullable=False)
    connection_name = Column(String, nullable=False)
    operation = Column(String, nullable=False)  # INSERT, UPDATE, UPSERT
    table_name = Column(String, nullable=False)
    row_count = Column(Integer, nullable=True)
    query_preview = Column(Text, nullable=True)
    ai_suggestion = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="success")  # success, failed
    error_message = Column(Text, nullable=True)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
