"""
Security headers middleware — mitigates XSS, clickjacking, MIME sniffing, and enforces HSTS.

Applied to every response. CSP is configured per-environment to allow development tools.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent framing (clickjacking protection)
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Disable unnecessary browser features
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), " "payment=(), usb=(), magnetometer=()"
        )

        # HSTS — enforce HTTPS (only in production/staging)
        if settings.ENVIRONMENT in ("production", "staging"):
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        else:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Content Security Policy — environment-aware
        if settings.ENVIRONMENT == "production":
            csp = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https: blob:; "
                "connect-src 'self' https://api.openai.com "
                "https://accounts.google.com https://github.com https://api.github.com; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            )
        else:
            # Development — allow Vite HMR and inline styles
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https: blob:; "
                "connect-src 'self' ws: wss: https://api.openai.com "
                "https://accounts.google.com https://github.com https://api.github.com; "
                "frame-ancestors 'none';"
            )

        response.headers["Content-Security-Policy"] = csp

        # Prevent caching of sensitive API responses
        if request.url.path.startswith("/api/") and request.url.path != "/api/health":
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"

        return response
