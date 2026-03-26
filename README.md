# NFC Data Ingestion Service

A self-service data ingestion platform with AI-powered query analysis and audit trails.

## Features

- Google OAuth authentication
- Multi-database support: PostgreSQL, ClickHouse, Sybase (stub)
- CSV upload with column mapping UI
- AI query analyzer (risk, optimization, cost estimation)
- Full audit log of all operations

## Architecture

```
backend/     → FastAPI (Python)
frontend/    → React + TypeScript (Vite)
users/       → Legacy standalone scripts
```

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env   # fill in credentials
pip3 install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:5173, API at http://localhost:8000.

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials (Web application)
3. Set authorized redirect URI to `http://localhost:8000/api/auth/callback`
4. Add client ID and secret to `backend/.env`
