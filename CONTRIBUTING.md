# Contributing

Thanks for your interest in contributing to the NFC Data Ingestion Service.

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (local instance for the app database)

### Backend Setup

```bash
cd backend
cp .env.example .env   # Fill in your local credentials
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend proxies `/api/*` requests to `http://localhost:8000`.

### Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

### Linting

```bash
# Backend (Python)
cd backend
ruff check app/ --select E,W,F,I,S,B

# Frontend (TypeScript)
cd frontend
npx prettier --check src/
```

## Development Guidelines

### Code Style

- **Python**: Follow PEP 8. We use `ruff` for linting. All code should pass `ruff check` without errors.
- **TypeScript/React**: Use Prettier for formatting. Components should not exceed 350 lines — extract sub-components into feature folders.
- **Constants**: No magic numbers or inline string literals. Use named constants in `src/constants/` with JSDoc comments.

### Architecture Principles

1. **Router layer is thin** — business logic lives in `app/services/`.
2. **Every admin endpoint** requires RBAC via `require_permission("admin:feature_name")`.
3. **All data queries** must filter by `user_id` to prevent cross-tenant data leaks.
4. **Audit everything** — operations that modify external databases must be logged via `AuditLog` with the hash chain.
5. **Rate limiting** — every endpoint must have an explicit rate limit decorator.
6. **Input validation** — use Pydantic models for request bodies, `validate_identifier()` for dynamic SQL identifiers.

### Security

- Passwords are encrypted at rest (AES-256-GCM for DB connections, bcrypt for user passwords).
- Never log secrets or full credentials. Use `_mask_email()` for safe logging.
- The `noqa: S608` suppressions are intentional — those queries use parameterized bindings (`:param` style), not string interpolation of user input.

### Branching & PRs

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Keep commits focused and atomic.
3. Write descriptive PR titles (under 70 chars).
4. Include a brief summary of what changed and what was tested.

### Adding a New Admin Tool

1. Create a new router in `backend/app/routers/your_tool.py`
2. Add a permission code (e.g. `admin:your_tool`) to `migrate_rbac.py`
3. Register the router in `backend/app/main.py`
4. Create the frontend page in `frontend/src/pages/YourTool.tsx`
5. Add the route in `frontend/src/App.tsx` (gated by permission check)
6. Update `.env.example` if new environment variables are needed

## Environment Variables

When adding new configuration, always:
1. Add it to `backend/.env.example` with a placeholder value and comment
2. Add the field to `backend/app/config.py` `Settings` class
3. Document what it controls in the `.env.example` comment

## Questions?

Open an issue or reach out to the team.
