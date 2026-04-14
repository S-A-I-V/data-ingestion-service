"""
AES-256-GCM encryption for sensitive fields (database passwords, SSH credentials).
Key is derived from ENCRYPTION_KEY env var using PBKDF2.
Salt is generated per-encryption and stored alongside the ciphertext.
"""

import base64
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.config import settings

_SALT_LEN = 16


def _derive_key(salt: bytes) -> bytes:
    raw = settings.ENCRYPTION_KEY.encode("utf-8")
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100_000)
    return kdf.derive(raw)


def encrypt(plaintext: str) -> str:
    """Encrypt a string. Returns base64-encoded salt+nonce+ciphertext."""
    if not plaintext:
        return ""
    salt = os.urandom(_SALT_LEN)
    key = _derive_key(salt)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    aesgcm = AESGCM(key)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.urlsafe_b64encode(salt + nonce + ct).decode("ascii")


def decrypt(token: str) -> str:
    """Decrypt a base64-encoded salt+nonce+ciphertext string.
    Also supports legacy format (nonce+ciphertext with hardcoded salt).
    """
    if not token:
        return ""
    raw = base64.urlsafe_b64decode(token)
    # New format: 16-byte salt + 12-byte nonce + ciphertext
    if len(raw) > _SALT_LEN + 12:
        try:
            salt, nonce, ct = raw[:_SALT_LEN], raw[_SALT_LEN : _SALT_LEN + 12], raw[_SALT_LEN + 12 :]
            key = _derive_key(salt)
            aesgcm = AESGCM(key)
            return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
        except Exception:  # noqa: S110
            pass  # Fall through to legacy format
    # Legacy format fallback: 12-byte nonce + ciphertext with static salt
    # Kept for backward compatibility with data encrypted before per-salt migration
    nonce, ct = raw[:12], raw[12:]
    key = _derive_key(b"nfc-data-ingestion-v1")  # legacy static salt — do not change
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
