"""
Structured logging configuration.

Supports two formats:
  - "structured" (default): JSON lines — ideal for ELK, CloudWatch, Datadog
  - "plain": Human-readable — ideal for local development

All log entries include:
  - timestamp (ISO 8601)
  - level
  - logger name
  - message
  - request_id (when available via ContextVar)
  - Extra fields from the log call
"""

import json
import logging
import sys
from datetime import datetime, timezone

from app.middleware.request_context import request_id_var, request_user_var


class StructuredFormatter(logging.Formatter):
    """JSON formatter for production log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get(""),
            "user": request_user_var.get("anonymous"),
        }

        # Include extra fields (passed via `extra={}` in log calls)
        for key in (
            "method",
            "path",
            "status_code",
            "duration_ms",
            "client_ip",
            "user_id",
            "connection_id",
            "rows_inserted",
            "rows_skipped",
            "pool_size",
            "checked_out",
            "error_type",
            "operation",
            "table_name",
            "file_size_bytes",
            "throughput_rps",
        ):
            val = getattr(record, key, None)
            if val is not None:
                log_entry[key] = val

        # Include exception info if present
        if record.exc_info and record.exc_info[1]:
            log_entry["exception"] = {
                "type": type(record.exc_info[1]).__name__,
                "message": str(record.exc_info[1]),
            }

        return json.dumps(log_entry, default=str)


class PlainFormatter(logging.Formatter):
    """Human-readable formatter for local development."""

    FORMAT = "%(asctime)s [%(levelname)-8s] %(name)s | %(message)s"

    def __init__(self):
        super().__init__(self.FORMAT, datefmt="%H:%M:%S")

    def format(self, record: logging.LogRecord) -> str:
        req_id = request_id_var.get("")
        if req_id:
            record.msg = f"[{req_id}] {record.msg}"
        return super().format(record)


def configure_logging(level: str = "INFO", log_format: str = "structured") -> None:
    """
    Configure application-wide logging.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: "structured" for JSON, "plain" for human-readable
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    root_logger.handlers.clear()

    # Choose formatter
    if log_format == "structured":
        formatter = StructuredFormatter()
    else:
        formatter = PlainFormatter()

    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # Suppress noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("authlib").setLevel(logging.WARNING)
