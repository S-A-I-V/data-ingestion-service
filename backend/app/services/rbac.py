"""
RBAC enforcement utilities.

Usage in routers:
    from app.services.rbac import require_permission

    @router.get("/admin-only")
    def admin_endpoint(user: User = Depends(require_permission("admin:some_feature"))):
        ...
"""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rbac import Permission, role_permissions, user_roles
from app.models.user import User
from app.routers.auth import get_current_user


def get_user_permissions(user_id: str, db: Session) -> set[str]:
    """Fetch all permission codes for a user via their roles."""
    rows = (
        db.query(Permission.code)
        .join(role_permissions, role_permissions.c.permission_id == Permission.id)
        .join(user_roles, user_roles.c.role_id == role_permissions.c.role_id)
        .filter(user_roles.c.user_id == user_id)
        .all()
    )
    return {row.code for row in rows}


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
