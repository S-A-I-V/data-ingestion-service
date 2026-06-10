# ═══════════════════════════════════════════════════════════════════════════════
# NFC Data Ingestion Service — Production Dockerfile
# ═══════════════════════════════════════════════════════════════════════════════
# Multi-stage build for minimal attack surface and fast deployments.

# Stage 1: Dependencies
FROM python:3.11-slim AS deps

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Stage 2: Application
FROM python:3.11-slim AS runtime

# Security: run as non-root
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy application code
COPY app/ ./app/

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

# Expose port
EXPOSE 8000

# Production server with multiple workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--access-log"]
