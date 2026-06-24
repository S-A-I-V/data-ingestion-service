"""
Application-wide constants — connection targets, fixed values, etc.

Admin tool connection targets are loaded from environment variables.
Set them in .env or via environment:
  - NFC_PROD_HOST, NFC_PROD_PORT, NFC_PROD_DB
  - LOOKUP_HOST, LOOKUP_PORT, LOOKUP_DB
"""

import os

# ── NFC Prod Database (Client Onboarding) ────────────────────────────────────

NFC_PROD_HOST = os.environ.get("NFC_PROD_HOST", "")
NFC_PROD_PORT = int(os.environ.get("NFC_PROD_PORT", "5432"))
NFC_PROD_DB = os.environ.get("NFC_PROD_DB", "")

# ── Customer Repository / Associate Lookup (Sybase) ──────────────────────────

LOOKUP_HOST = os.environ.get("LOOKUP_HOST", "")
LOOKUP_PORT = int(os.environ.get("LOOKUP_PORT", "2125"))
LOOKUP_DB = os.environ.get("LOOKUP_DB", "")
