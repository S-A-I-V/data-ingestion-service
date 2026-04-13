from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import engine, Base
from app.routers import auth, connections, ingestion, audit, ai
from app.middleware.security import SecurityHeadersMiddleware

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NFC Data Ingestion Service", version="1.0.0")

# Rate limiter
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security headers (outermost — runs on every response)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(connections.router)
app.include_router(ingestion.router)
app.include_router(audit.router)
app.include_router(ai.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
