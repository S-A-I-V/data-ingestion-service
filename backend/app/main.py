from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import auth, connections, ingestion, audit, ai

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NFC Data Ingestion Service", version="1.0.0")

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
