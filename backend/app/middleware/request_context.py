"""
Request context middleware — adds correlation ID and request timing.

Every request gets a unique X-Request-ID header (or uses an existing one from
upstream load balancers). This ID is propagated through all log entries for
end-to-end tracing.
"""

import logging
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

# Context variable for request ID — accessible anywhere in the call stack
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
request_user_var: ContextVar[str] = ContextVar("request_user", default="anonymous")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that:
    1. Assigns/propagates a correlation ID (X-Request-ID)
    2. Logs request start/end with timing
    3. Makes request context available via ContextVars
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Use existing correlation ID from upstream or generate new
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:12]
        request_id_var.set(req_id)

        # Attach to request state for access in route handlers
        request.state.request_id = req_id

        start_time = time.time()

        logger.info(
            "request_started",
            extra={
                "request_id": req_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else "unknown",
            },
        )

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "request_failed_unhandled",
                extra={
                    "request_id": req_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                },
                exc_info=True,
            )
            raise

        duration_ms = int((time.time() - start_time) * 1000)

        # Add correlation headers to response
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Response-Time-Ms"] = str(duration_ms)

        log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            log_level,
            "request_completed",
            extra={
                "request_id": req_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )

        return response
