"""
RBAC Admin Router — User management, role assignment, permission viewing.

Endpoints:
  GET  /users           — List all users with their roles
  GET  /users/:id       — Get single user with roles and permissions
  GET  /roles           — List all roles with permission counts
  GET  /roles/:id       — Get single role with its permissions
  GET  /permissions     — List all permissions
  POST /users/:id/roles — Assign role to user
  DELETE /users/:id/roles/:role_id — Revoke role from user
  GET  /cache/stats     — Get permission cache statistics
  POST /cache/invalidate — Invalidate permission cache (all or by user)

Requires 'admin:manage_users' permission for all endpoints.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rbac import Permission, Role, role_permissions, user_roles
from app.models.user import User
from app.routers.auth import limiter
from app.services.rbac import (
    get_cache_stats,
    get_user_permissions,
    invalidate_all_permissions,
    invalidate_user_permissions,
    require_permission,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/rbac", tags=["admin"])

REQUIRED_PERMISSION = "admin:manage_users"


# ── Schemas ───────────────────────────────────────────────────────────────────


class AssignRoleRequest(BaseModel):
    role_id: int


class InvalidateCacheRequest(BaseModel):
    user_id: Optional[str] = None  # If None, invalidates all


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    created_at: Optional[str] = None
    last_login: Optional[str] = None
    roles: list[dict]
    permissions: list[str]


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    permission_count: int
    user_count: int


class PermissionResponse(BaseModel):
    id: int
    code: str
    description: Optional[str] = None


# ── User Endpoints ────────────────────────────────────────────────────────────


@router.get("/users")
@limiter.limit("30/minute")
def list_users(
    request: Request,
    search: str = Query(default=None, description="Search by email or name"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
):
    """List all users with their assigned roles."""
    query = db.query(User)

    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(User.email).like(search_pattern)) | (func.lower(User.name).like(search_pattern))
        )

    total = query.count()
    users = query.order_by(User.email).offset(offset).limit(limit).all()

    result = []
    for u in users:
        # Get user's roles
        user_role_rows = (
            db.query(Role).join(user_roles, user_roles.c.role_id == Role.id).filter(user_roles.c.user_id == u.id).all()
        )
        roles = [{"id": r.id, "name": r.name} for r in user_role_rows]

        result.append(
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "picture": u.picture,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login": u.last_login.isoformat() if u.last_login else None,
                "roles": roles,
            }
        )

    return {"users": result, "total": total, "limit": limit, "offset": offset}


@router.get("/users/{user_id}")
@limiter.limit("30/minute")
def get_user(
    user_id: str,
    request: Request,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
):
    """Get a single user with their roles and effective permissions."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get user's roles
    user_role_rows = (
        db.query(Role).join(user_roles, user_roles.c.role_id == Role.id).filter(user_roles.c.user_id == user_id).all()
    )
    roles = [{"id": r.id, "name": r.name, "description": r.description} for r in user_role_rows]

    # Get effective permissions (via cache)
    permissions = list(get_user_permissions(user_id, db))

    return {
        "id": target_user.id,
        "email": target_user.email,
        "name": target_user.name,
        "picture": target_user.picture,
        "created_at": target_user.created_at.isoformat() if target_user.created_at else None,
        "last_login": target_user.last_login.isoformat() if target_user.last_login else None,
        "roles": roles,
        "permissions": sorted(permissions),
    }


@router.post("/users/{user_id}/roles")
@limiter.limit("10/minute")
def assign_role(
    user_id: str,
    request: Request,
    body: AssignRoleRequest,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
):
    """Assign a role to a user."""
    # Validate user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate role exists
    role = db.query(Role).filter(Role.id == body.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if already assigned
    existing = db.execute(
        user_roles.select().where(user_roles.c.user_id == user_id, user_roles.c.role_id == body.role_id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"User already has role '{role.name}'")

    # Assign role
    db.execute(user_roles.insert().values(user_id=user_id, role_id=body.role_id))
    db.commit()

    # Invalidate permission cache for this user
    invalidate_user_permissions(user_id)

    logger.info(
        "Role assigned",
        extra={
            "target_user_id": user_id,
            "target_email": target_user.email,
            "role_id": body.role_id,
            "role_name": role.name,
            "assigned_by": user.email,
        },
    )

    return {
        "message": f"Role '{role.name}' assigned to {target_user.email}",
        "user_id": user_id,
        "role_id": body.role_id,
        "role_name": role.name,
    }


@router.delete("/users/{user_id}/roles/{role_id}")
@limiter.limit("10/minute")
def revoke_role(
    user_id: str,
    role_id: int,
    request: Request,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
):
    """Revoke a role from a user."""
    # Validate user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate role exists
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Check if assignment exists
    existing = db.execute(
        user_roles.select().where(user_roles.c.user_id == user_id, user_roles.c.role_id == role_id)
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail=f"User does not have role '{role.name}'")

    # Prevent removing your own admin role (safety check)
    if user_id == user.id and role.name == "admin":
        raise HTTPException(status_code=400, detail="Cannot remove your own admin role")

    # Revoke role
    db.execute(user_roles.delete().where(user_roles.c.user_id == user_id, user_roles.c.role_id == role_id))
    db.commit()

    # Invalidate permission cache for this user
    invalidate_user_permissions(user_id)

    logger.info(
        "Role revoked",
        extra={
            "target_user_id": user_id,
            "target_email": target_user.email,
            "role_id": role_id,
            "role_name": role.name,
            "revoked_by": user.email,
        },
    )

    return {
        "message": f"Role '{role.name}' revoked from {target_user.email}",
        "user_id": user_id,
        "role_id": role_id,
        "role_name": role.name,
    }


# ── Role Endpoints ────────────────────────────────────────────────────────────


@router.get("/roles")
@limiter.limit("30/minute")
def list_roles(
    request: Request,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
):
    """List all roles with permission and user counts."""
    roles = db.query(Role).order_by(Role.name).all()

    result = []
    for role in roles:
        # Count permissions for this role
        perm_count = db.execute(role_permissions.select().where(role_permissions.c.role_id == role.id)).fetchall()

        # Count users with this role
        user_count = db.execute(user_roles.select().where(user_roles.c.role_id == role.id)).fetchall()

        result.append(
            {
                "id": role.id,
                "name": role.name,
                "description": role.description,
                "permission_count": len(perm_count),
                "user_count": len(user_count),
                "created_at": role.created_at.isoformat() if role.created_at else None,
            }
        )

    return {"roles": result, "total": len(result)}


@router.get("/roles/{role_id}")
@limiter.limit("30/minute")
def get_role(
    role_id: int,
    request: Request,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
):
    """Get a single role with its permissions and assigned users."""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Get permissions for this role
    perms = (
        db.query(Permission)
        .join(role_permissions, role_permissions.c.permission_id == Permission.id)
        .filter(role_permissions.c.role_id == role_id)
        .order_by(Permission.code)
        .all()
    )

    # Get users with this role
    users_with_role = (
        db.query(User).join(user_roles, user_roles.c.user_id == User.id).filter(user_roles.c.role_id == role_id).all()
    )

    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "created_at": role.created_at.isoformat() if role.created_at else None,
        "permissions": [{"id": p.id, "code": p.code, "description": p.description} for p in perms],
        "users": [{"id": u.id, "email": u.email, "name": u.name} for u in users_with_role],
    }


# ── Permission Endpoints ──────────────────────────────────────────────────────


@router.get("/permissions")
@limiter.limit("30/minute")
def list_permissions(
    request: Request,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
    db: Session = Depends(get_db),
):
    """List all available permissions."""
    perms = db.query(Permission).order_by(Permission.code).all()

    return {
        "permissions": [{"id": p.id, "code": p.code, "description": p.description} for p in perms],
        "total": len(perms),
    }


# ── Cache Management ──────────────────────────────────────────────────────────


@router.get("/cache/stats")
@limiter.limit("30/minute")
def cache_stats(
    request: Request,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
):
    """Get permission cache statistics."""
    return get_cache_stats()


@router.post("/cache/invalidate")
@limiter.limit("10/minute")
def invalidate_cache(
    request: Request,
    body: InvalidateCacheRequest,
    user: User = Depends(require_permission(REQUIRED_PERMISSION)),
):
    """Invalidate permission cache — for a specific user or all users."""
    if body.user_id:
        invalidate_user_permissions(body.user_id)
        logger.info(f"Permission cache invalidated for user {body.user_id} by {user.email}")
        return {"message": f"Cache invalidated for user {body.user_id}"}
    else:
        invalidate_all_permissions()
        logger.info(f"All permission caches invalidated by {user.email}")
        return {"message": "All permission caches invalidated"}
