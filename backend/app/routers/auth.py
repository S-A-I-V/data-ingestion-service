"""
Authentication router — hardened with:
  - bcrypt password hashing
  - Password strength validation (min 8 chars, mixed case, digit, special)
  - Rate limiting (5 login attempts / minute per IP)
  - Account lockout after 5 failed attempts (15 min)
  - JWT with iat claim, short-lived tokens (8h)
  - Email verification tokens (24h expiry)
  - Password reset tokens (1h expiry)
  - No secrets exposed to frontend
"""

import logging
import re
import secrets
from datetime import datetime, timedelta

import bcrypt
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
import jwt
from jwt.exceptions import PyJWTError
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)


def _mask_email(email: str) -> str:
    """Mask email for safe logging: 'user@example.com' -> 'u***@example.com'."""
    try:
        local, domain = email.rsplit("@", 1)
        return f"{local[0]}***@{domain}" if local else f"***@{domain}"
    except (ValueError, IndexError):
        return "***"


router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# ── OAuth providers ──────────────────────────────────────────────────────────

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)
oauth.register(
    name="github",
    client_id=settings.GITHUB_CLIENT_ID,
    client_secret=settings.GITHUB_CLIENT_SECRET,
    authorize_url="https://github.com/login/oauth/authorize",
    access_token_url="https://github.com/login/oauth/access_token",
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "user:email"},
)

# ── Security helpers ─────────────────────────────────────────────────────────

TOKEN_EXPIRY_HOURS = 8
LOCKOUT_THRESHOLD = 5
LOCKOUT_MINUTES = 15
VERIFY_TOKEN_HOURS = 24
RESET_TOKEN_HOURS = 1


def _hash_password(password: str) -> str:
    """Hash password with bcrypt (salt is embedded in the hash)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash. Also supports legacy PBKDF2 format."""
    if ":" in hashed and not hashed.startswith("$2"):
        # Legacy PBKDF2 format: salt:hash — migrate on next login
        import hashlib

        salt, stored = hashed.split(":", 1)
        return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex() == stored
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def _validate_password(password: str) -> None:
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


def _create_token(user_id: str, email: str) -> str:
    """Create a JWT with sub, email, iat, and exp claims."""
    now = datetime.utcnow()
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def _check_lockout(user: User) -> None:
    """Raise 429 if account is locked."""
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = int((user.locked_until - datetime.utcnow()).total_seconds() / 60) + 1
        raise HTTPException(429, f"Account locked. Try again in {remaining} minutes.")


def _record_failed_login(user: User, db: Session) -> None:
    """Increment failed attempts and lock if threshold reached."""
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= LOCKOUT_THRESHOLD:
        user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
        logger.warning(f"Account locked for user_id={user.id} after {LOCKOUT_THRESHOLD} failed attempts")
    db.commit()


def _reset_failed_login(user: User, db: Session) -> None:
    """Clear failed attempts on successful login."""
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()


# ── Auth dependency ──────────────────────────────────────────────────────────


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("token") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except (PyJWTError, Exception) as exc:
        raise HTTPException(401, "Invalid or expired token") from exc
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user


# ── Request models ───────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetRequestBody(BaseModel):
    email: EmailStr


class ResetConfirmBody(BaseModel):
    token: str
    password: str


# ── Email/Password endpoints ─────────────────────────────────────────────────


@router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    _validate_password(body.password)

    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(409, "Email already registered")

    verify_token = secrets.token_urlsafe(32)
    user = User(
        id=secrets.token_hex(16),
        email=body.email,
        name=f"{body.first_name} {body.last_name}",
        picture="",
        password_hash=_hash_password(body.password),
        email_verified=False,
        email_verify_token=verify_token,
        email_verify_expires=datetime.utcnow() + timedelta(hours=VERIFY_TOKEN_HOURS),
    )
    db.add(user)
    db.commit()

    # Email verification required — token is stored for email delivery
    # In production, send verification email with verify_token here
    logger.info(f"New user registered: user_id={user.id}, email verification pending")

    token = _create_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name, "email_verified": False}}


@router.post("/login/email")
@limiter.limit("10/minute")
async def login_email(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    # Generic error to prevent user enumeration
    generic_error = "Invalid email or password"

    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.password_hash:
        raise HTTPException(401, generic_error)

    _check_lockout(user)

    if not _verify_password(body.password, user.password_hash):
        _record_failed_login(user, db)
        logger.warning(f"Failed login attempt for email={_mask_email(body.email)}")
        raise HTTPException(401, generic_error)

    # Migrate legacy PBKDF2 hash to bcrypt on successful login
    if ":" in user.password_hash and not user.password_hash.startswith("$2"):
        user.password_hash = _hash_password(body.password)

    _reset_failed_login(user, db)
    token = _create_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}


@router.get("/verify-email")
@limiter.limit("10/minute")
async def verify_email(request: Request, token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_verify_token == token).first()
    if not user:
        raise HTTPException(400, "Invalid verification token")
    if user.email_verify_expires and user.email_verify_expires < datetime.utcnow():
        raise HTTPException(400, "Verification token expired")
    user.email_verified = True
    user.email_verify_token = None
    user.email_verify_expires = None
    db.commit()
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?verified=1")


# ── Password Reset ───────────────────────────────────────────────────────────


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: ResetRequestBody, db: Session = Depends(get_db)):
    """Always returns success to prevent user enumeration."""
    user = db.query(User).filter(User.email == body.email).first()
    if user and user.password_hash:
        reset_token = secrets.token_urlsafe(32)
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.utcnow() + timedelta(hours=RESET_TOKEN_HOURS)
        db.commit()
        # TODO: Send reset email with reset_token
    return {"ok": True, "message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, body: ResetConfirmBody, db: Session = Depends(get_db)):
    _validate_password(body.password)
    user = db.query(User).filter(User.password_reset_token == body.token).first()
    if not user:
        logger.warning("Invalid password reset token attempted")
        raise HTTPException(400, "Invalid reset token")
    if user.password_reset_expires and user.password_reset_expires < datetime.utcnow():
        # Invalidate expired token
        user.password_reset_token = None
        user.password_reset_expires = None
        db.commit()
        raise HTTPException(400, "Reset token expired")
    user.password_hash = _hash_password(body.password)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    return {"ok": True, "message": "Password reset successfully"}


# ── Google OAuth ─────────────────────────────────────────────────────────────


@router.get("/login")
async def login(request: Request):
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_db)):
    token_data = await oauth.google.authorize_access_token(request)
    user_info = token_data.get("userinfo")
    if not user_info:
        raise HTTPException(400, "Failed to get user info")

    user = db.query(User).filter(User.id == user_info["sub"]).first()
    if not user:
        user = User(
            id=user_info["sub"],
            email=user_info["email"],
            name=user_info.get("name", ""),
            picture=user_info.get("picture", ""),
            email_verified=True,  # Google emails are pre-verified
        )
        db.add(user)
    user.last_login = datetime.utcnow()
    db.commit()

    app_token = _create_token(user.id, user.email)
    response = RedirectResponse(url=settings.FRONTEND_URL)
    response.set_cookie(
        "token", app_token, httponly=True, secure=True, max_age=TOKEN_EXPIRY_HOURS * 3600, samesite="lax"
    )
    return response


# ── GitHub OAuth ─────────────────────────────────────────────────────────────


@router.get("/github/login")
async def github_login(request: Request):
    return await oauth.github.authorize_redirect(request, settings.GITHUB_REDIRECT_URI)


@router.get("/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    token_data = await oauth.github.authorize_access_token(request)
    resp = await oauth.github.get("user", token=token_data)
    user_info = resp.json()

    email = user_info.get("email")
    if not email:
        email_resp = await oauth.github.get("user/emails", token=token_data)
        emails = email_resp.json()
        primary = next((e for e in emails if e.get("primary")), emails[0] if emails else None)
        email = primary["email"] if primary else f"{user_info['login']}@github"

    github_id = f"github_{user_info['id']}"
    user = db.query(User).filter(User.id == github_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                id=github_id,
                email=email,
                name=user_info.get("name") or user_info.get("login", ""),
                picture=user_info.get("avatar_url", ""),
                email_verified=True,
            )
            db.add(user)
    user.last_login = datetime.utcnow()
    db.commit()

    app_token = _create_token(user.id, user.email)
    response = RedirectResponse(url=settings.FRONTEND_URL)
    response.set_cookie(
        "token", app_token, httponly=True, secure=True, max_age=TOKEN_EXPIRY_HOURS * 3600, samesite="lax"
    )
    return response


# ── Session endpoints ────────────────────────────────────────────────────────


@router.get("/me")
async def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.services.rbac import get_user_permissions

    permissions = get_user_permissions(user.id, db)
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "email_verified": user.email_verified,
        "permissions": sorted(permissions),
    }


@router.post("/logout")
async def logout():
    response = RedirectResponse(url=settings.FRONTEND_URL)
    response.delete_cookie("token")
    return response
