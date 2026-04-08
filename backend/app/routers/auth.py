from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from jose import jwt
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import hashlib
import secrets

from app.config import settings
from app.database import get_db
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000).hex()


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("token") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Email/Password Auth ──────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    salt = secrets.token_hex(16)
    hashed = _hash_password(body.password, salt)
    user_id = secrets.token_hex(16)

    user = User(
        id=user_id,
        email=body.email,
        name=f"{body.first_name} {body.last_name}",
        picture="",
        password_hash=f"{salt}:{hashed}",
    )
    db.add(user)
    db.commit()

    token = create_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}


@router.post("/login/email")
async def login_email(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    salt, stored_hash = user.password_hash.split(":", 1)
    if _hash_password(body.password, salt) != stored_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}


# ── Google OAuth ─────────────────────────────────────────────────────────────

@router.get("/login")
async def login(request: Request):
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_db)):
    token_data = await oauth.google.authorize_access_token(request)
    user_info = token_data.get("userinfo")
    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to get user info")

    user = db.query(User).filter(User.id == user_info["sub"]).first()
    if not user:
        user = User(
            id=user_info["sub"],
            email=user_info["email"],
            name=user_info.get("name", ""),
            picture=user_info.get("picture", ""),
        )
        db.add(user)
    else:
        user.last_login = datetime.utcnow()
    db.commit()

    app_token = create_token(user.id, user.email)
    response = RedirectResponse(url=settings.FRONTEND_URL)
    response.set_cookie("token", app_token, httponly=True, max_age=86400, samesite="lax")
    return response


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name, "picture": user.picture}


@router.post("/logout")
async def logout():
    response = RedirectResponse(url=settings.FRONTEND_URL)
    response.delete_cookie("token")
    return response
