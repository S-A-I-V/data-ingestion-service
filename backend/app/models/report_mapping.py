"""
Saved Report Mappings — per-user saved DAG configurations for report→job pipelines.

Each mapping stores the full graph (nodes + edges) as JSONB, allowing users to
save, reload, and export their pipeline configurations.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.database import Base


class SavedReportMapping(Base):
    __tablename__ = "saved_report_mappings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    report_name = Column(String(255), nullable=True)
    application_name = Column(String(255), nullable=True)
    mapping_data = Column(JSONB, nullable=False)  # {nodes: [...], edges: [...]}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
