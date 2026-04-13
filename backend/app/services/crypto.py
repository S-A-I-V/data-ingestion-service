"""
AES-256-GCM encryption for sensitive fields (database passwords, SSH credentials).
Key is derived from ENCRYPTION_KEY env var using PBKDF2.
"""

import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

from app.config import settings

from typing import Optional

_SALT = b"nfc-data-ingestion-v1"
_KEY_CACHE: Optional[bytes] = None


def _derive_key() -> bytes:
    global _KEY_CACHE
    if _KEY_CACHE is not None:
        return _KEY_CACHE
    raw = settings.ENCRYPTION_KEY.encode("utf-8")
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=_SALT, iterations=100_000)
    _KEY_CACHE = kdf.derive(raw)
    return _KEY_CACHE


def encrypt(plaintext: str) -> str:
    """Encrypt a string. Returns base64-encoded nonce+ciphertext."""
    if not plaintext:
        return ""
    key = _derive_key()
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.urlsafe_b64encode(nonce + ct).decode("ascii")


def decrypt(token: str) -> str:
    """Decrypt a base64-encoded nonce+ciphertext string."""
    if not token:
        return ""
    key = _derive_key()
    raw = base64.urlsafe_b64decode(token)
    nonce, ct = raw[:12], raw[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
