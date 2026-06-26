"""
Application-wide constants — connection targets, fixed values, etc.

Admin tool connection targets are loaded from environment variables.
Set them in .env or via environment:
  - NFC_PROD_HOST, NFC_PROD_PORT, NFC_PROD_DB
  - LOOKUP_HOST, LOOKUP_PORT, LOOKUP_DB
"""

from app.config import settings

# ── NFC Prod Database (Client Onboarding) ────────────────────────────────────

NFC_PROD_HOST = settings.NFC_PROD_HOST
NFC_PROD_PORT = settings.NFC_PROD_PORT
NFC_PROD_DB = settings.NFC_PROD_DB

# ── Customer Repository / Associate Lookup (Sybase) ──────────────────────────

LOOKUP_HOST = settings.LOOKUP_HOST
LOOKUP_PORT = settings.LOOKUP_PORT
LOOKUP_DB = settings.LOOKUP_DB
