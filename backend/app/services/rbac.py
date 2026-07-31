"""
RBAC enforcement utilities.

Usage in routers:
    from app.services.rbac import require_permission

    @router.get("/admin-only")
    def admin_endpoint(user: User = Depends(require_permission("admin:some_feature"))):
        ...

Cache invalidation (after role changes):
    from app.services.rbac import invalidate_user_permissions
    invalidate_user_permissions(user_id)
"""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rbac import Permission, role_permissions, user_roles
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.permission_cache import permission_cache


def get_user_permissions(user_id: str, db: Session) -> set[str]:
    """
    Fetch all permission codes for a user via their roles.
    Uses cache with automatic TTL expiration.
    """
    return permission_cache.get_permissions(user_id, db)


def get_user_permissions_uncached(user_id: str, db: Session) -> set[str]:
    """Fetch permissions directly from DB, bypassing cache."""
    rows = (
        db.query(Permission.code)
        .join(role_permissions, role_permissions.c.permission_id == Permission.id)
        .join(user_roles, user_roles.c.role_id == role_permissions.c.role_id)
        .filter(user_roles.c.user_id == user_id)
        .all()
    )
    return {row.code for row in rows}


def invalidate_user_permissions(user_id: str) -> None:
    """Invalidate cached permissions for a user. Call after role assignment changes."""
    permission_cache.invalidate(user_id)


def invalidate_all_permissions() -> None:
    """Invalidate all cached permissions. Call after bulk permission/role changes."""
    permission_cache.invalidate_all()


def get_cache_stats() -> dict:
    """Return permission cache statistics."""
    return permission_cache.stats()


def require_permission(permission_code: str):
    """
    FastAPI dependency that checks if the current user has a specific permission.
    Returns the User object if authorized, raises 403 otherwise.
    """

    def dependency(
        request: Request,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        permissions = get_user_permissions(user.id, db)
        if permission_code not in permissions:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: requires '{permission_code}'",
            )
        return user

    return dependency
