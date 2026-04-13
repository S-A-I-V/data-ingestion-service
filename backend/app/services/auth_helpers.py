"""
Authentication helper functions — password hashing, JWT creation, lockout management.
Extracted from auth router for separation of concerns and testability.
"""

import hashlib
import re
from datetime import datetime, timedelta

import bcrypt
from fastapi import HTTPException
from jose import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User

TOKEN_EXPIRY_HOURS = 8
LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15
VERIFY_TOKEN_HOURS = 24
RESET_TOKEN_HOURS = 1


def hash_password(password: str) -> str:
    """Hash password with bcrypt (salt is embedded in the hash)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash. Also supports legacy PBKDF2 format."""
    if ":" in hashed and not hashed.startswith("$2"):
        salt, stored = hashed.split(":", 1)
        return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex() == stored
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def validate_password(password: str) -> None:
    """Enforce password strength: min 8 chars, upper, lower, digit, special."""
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(400, "Password must contain an uppercase letter")
    if not re.search(r"[a-z]", password):
        raise HTTPException(400, "Password must contain a lowercase letter")
    if not re.search(r"\d", password):
        raise HTTPException(400, "Password must contain a digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/`~]", password):
        raise HTTPException(400, "Password must contain a special character")


def create_token(user_id: str, email: str) -> str:
    """Create a JWT with sub, email, iat, and exp claims."""
    now = datetime.utcnow()
    return jwt.encode(
        {"sub": user_id, "email": email, "iat": now, "exp": now + timedelta(hours=TOKEN_EXPIRY_HOURS)},
        settings.SECRET_KEY,
        algorithm="HS256",
    )


def check_lockout(user: User) -> None:
    """Raise 429 if account is locked."""
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
        raise HTTPException(429, f"Account locked. Try again in {remaining} minutes.")


def record_failed_login(user: User, db: Session) -> None:
    """Increment failed attempts and lock if threshold reached."""
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= LOCKOUT_THRESHOLD:
        user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
    db.commit()


def reset_failed_login(user: User, db: Session) -> None:
    """Clear failed attempts on successful login."""
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()
