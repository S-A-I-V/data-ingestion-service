"""
Application-wide constants — connection targets, fixed values, etc.

Centralizes all hardcoded connection details so they're easy to find,
update, and eventually move to environment variables.
"""

# ── NFC Prod Database (Client Onboarding) ────────────────────────────────────

NFC_PROD_HOST = "REDACTED_HOST"
NFC_PROD_PORT = 5432
NFC_PROD_DB = "REDACTED_DB"

# ── Customer Repository / Associate Lookup (Sybase) ──────────────────────────

LOOKUP_HOST = "REDACTED_HOST"
LOOKUP_PORT = 2125
LOOKUP_DB = "REDACTED_DB"
