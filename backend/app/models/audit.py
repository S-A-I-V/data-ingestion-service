"""
Audit log with hash-chain integrity.

Each record includes a SHA-256 hash of its content + the previous record's hash,
forming an immutable chain. Any tampering breaks the chain and is detectable.

Indexes are defined for common query patterns:
  - user_id + executed_at (dashboard queries, per-user history)
  - connection_id (connection-specific audit trails)
  - status (filtering failed operations)
  - executed_at (time-range queries, retention policies)
"""

from __future__ import annotations

import hashlib

from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    user_email = Column(String, nullable=False)
    connection_id = Column(Integer, ForeignKey("db_connections.id"), nullable=False, index=True)
    connection_name = Column(String, nullable=False)
    operation = Column(String(50), nullable=False)
    table_name = Column(String(256), nullable=False)
    row_count = Column(Integer, nullable=True)
    query_preview = Column(Text, nullable=True)
    ai_suggestion = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="success", index=True)
    error_message = Column(Text, nullable=True)
    executed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # ── Execution Metrics ──
    rows_inserted = Column(Integer, nullable=True)
    rows_skipped = Column(Integer, nullable=True)
    throughput_rps = Column(Float, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    data_size_bytes = Column(BigInteger, nullable=True)
    parse_time_ms = Column(Integer, nullable=True)
    ingestion_time_ms = Column(Integer, nullable=True)
    total_time_ms = Column(Integer, nullable=True)
    error_rows = Column(Integer, nullable=True)
    duplicate_count = Column(Integer, nullable=True)
    validation_score = Column(Float, nullable=True)
    peak_memory_bytes = Column(BigInteger, nullable=True)
    cpu_time_s = Column(Float, nullable=True)

    # Hash chain fields
    prev_hash = Column(String(64), nullable=True)
    record_hash = Column(String(64), nullable=True)

    # ── Composite Indexes ─────────────────────────────────────────────────────
    __table_args__ = (
        # Primary query pattern: user's operations sorted by time
        Index("idx_audit_user_time", "user_id", "executed_at"),
        # Connection-specific history
        Index("idx_audit_connection_time", "connection_id", "executed_at"),
        # Failed operations monitoring
        Index("idx_audit_status_time", "status", "executed_at"),
    )

    def compute_hash(self) -> str:
        """Compute SHA-256 hash of this record's auditable content."""
        content = (
            f"{self.user_id}|{self.user_email}|{self.connection_id}|"
            f"{self.connection_name}|{self.operation}|{self.table_name}|"
            f"{self.row_count}|{self.query_preview}|{self.status}|"
            f"{self.error_message}|{self.prev_hash or 'GENESIS'}"
        )
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def seal(self, prev_hash=None) -> None:
        """Set the hash chain fields. Call before committing."""
        self.prev_hash = prev_hash or ""
        self.record_hash = self.compute_hash()
