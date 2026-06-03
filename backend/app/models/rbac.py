"""
Role-Based Access Control (RBAC) models.

Schema:
  users ──┐
           ├── user_roles (user_id, role_id)
  roles ──┘         │
           ├── role_permissions (role_id, permission_id)
  permissions ──────┘

Roles are named groups (admin, user, viewer).
Permissions are granular capabilities (admin:associate_lookup, admin:manage_users).
A user can have multiple roles; each role can have multiple permissions.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

# ── Junction Tables ──────────────────────────────────────────────────────────

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("assigned_at", DateTime(timezone=True), server_default=func.now()),
)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


# ── Role ─────────────────────────────────────────────────────────────────────


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles", lazy="joined")


# ── Permission ───────────────────────────────────────────────────────────────


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(100), unique=True, nullable=False)
    description = Column(String(200), nullable=True)

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")
