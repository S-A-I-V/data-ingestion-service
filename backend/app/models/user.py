"""
User model — authentication and account management.

Supports:
  - OAuth (Google, GitHub) — id is the provider's subject ID
  - Email/password — bcrypt hashed, with lockout protection
  - Email verification with token + expiry
  - Password reset with token + expiry
"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String(320), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    picture = Column(String(2000), nullable=True)
    password_hash = Column(String(200), nullable=True)

    # Email verification
    email_verified = Column(Boolean, default=False, nullable=False, server_default="false")
    email_verify_token = Column(String(200), nullable=True)
    email_verify_expires = Column(DateTime(timezone=True), nullable=True)

    # Password reset
    password_reset_token = Column(String(200), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)

    # Account lockout
    failed_login_attempts = Column(Integer, default=0, nullable=False, server_default="0")
    locked_until = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
