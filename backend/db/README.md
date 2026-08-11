# Database Migrations (Liquibase)

```
██████╗  █████╗  ██████╗██╗  ██╗███████╗███╗   ██╗██████╗
██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝████╗  ██║██╔══██╗
██████╔╝███████║██║     █████╔╝ █████╗  ██╔██╗ ██║██║  ██║
██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██║╚██╗██║██║  ██║
██████╔╝██║  ██║╚██████╗██║  ██╗███████╗██║ ╚████║██████╔╝
╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═════╝
             Schema: nfc_admin | DB: nfc_prod | Liquibase
```

This directory contains the schema management for the **nfc_admin** app.

## Architecture

```
nfc_prod (AWS RDS PostgreSQL)
├── public         ← NFC platform tables (managed by NFC team's Liquibase)
└── nfc_admin      ← This app's tables (managed by this directory's Liquibase)
```

Liquibase changelog tracking tables (`databasechangelog`, `databasechangeloglock`) are stored
in the `nfc_admin` schema — completely isolated from the platform's tracking.

## Credentials

Liquibase reuses the **same DB credentials as the application** (no dedicated Liquibase user).
This matches the NFC platform pattern.

| Environment | DB_USER | DB_PASSWORD | Source |
|-------------|---------|-------------|--------|
| Local/dev | `postgres` | `postgres` | `.env` file |
| CI (dev/qa) | `$NFC_ADMIN_DB_USER` | `$NFC_ADMIN_DB_PASSWORD` | GitLab CI masked variables |
| CI (prod) | `$NFC_ADMIN_DB_USER_PROD` | `$NFC_ADMIN_DB_PASSWORD_PROD` | GitLab CI masked variables |

## Running Locally

```bash
# From the backend/ directory — uses DB_HOST, DB_USER, DB_PASSWORD from .env
liquibase --defaults-file=db/liquibase.properties update
```

## CI/CD

The `DB_MIGRATE_*` jobs in `.gitlab-ci.yml` run automatically when `backend/db/**` files change.
Credentials are injected via GitLab CI/CD masked variables (Settings → CI/CD → Variables).

### Variables to set in GitLab CI/CD:

**Dev/QA environments:**
- `NFC_ADMIN_DB_HOST` — e.g. `nfc-prod-db.cgubhdwnqvih.us-east-1.rds.amazonaws.com`
- `NFC_ADMIN_DB_NAME` — e.g. `nfc_prod`
- `NFC_ADMIN_DB_USER` — your DB username
- `NFC_ADMIN_DB_PASSWORD` — your DB password (masked)

**Prod environment:**
- `NFC_ADMIN_DB_HOST_PROD`
- `NFC_ADMIN_DB_NAME_PROD`
- `NFC_ADMIN_DB_USER_PROD`
- `NFC_ADMIN_DB_PASSWORD_PROD` (masked)

## Checking Status

```bash
liquibase --defaults-file=db/liquibase.properties status
```

## Rolling Back

```bash
# Roll back the last N changesets
liquibase --defaults-file=db/liquibase.properties rollbackCount 1
```

## Adding New Changesets

1. Create a new XML file in `db/changesets/` with the next sequence number
2. Add an `<include>` entry in `db/changelog-master.xml`
3. Use `schemaName="nfc_admin"` on all DDL operations
4. Always include a `<rollback>` block
5. Run locally: `liquibase --defaults-file=db/liquibase.properties update`
6. Commit — CI will auto-apply on the next deploy
