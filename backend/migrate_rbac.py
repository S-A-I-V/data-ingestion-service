"""
Migration: Create RBAC tables (roles, permissions, user_roles, role_permissions)
and seed initial data.

Run with: python3 migrate_rbac.py
"""

from app.database import Base, SessionLocal, engine
from app.models.rbac import Permission, Role, role_permissions, user_roles

# Ensure tables exist
Base.metadata.create_all(
    bind=engine,
    tables=[
        Role.__table__,
        Permission.__table__,
        user_roles,
        role_permissions,
    ],
)


def seed():
    db = SessionLocal()
    try:
        # ── Create Roles ──
        roles_data = [
            ("admin", "Full access to all features including admin tools"),
            ("user", "Standard user — can manage connections and run ingestions"),
            ("viewer", "Read-only access to audit logs and dashboards"),
        ]
        for name, desc in roles_data:
            existing = db.query(Role).filter(Role.name == name).first()
            if not existing:
                db.add(Role(name=name, description=desc))
                print(f"  ✓ Role created: {name}")
            else:
                print(f"  – Role exists: {name}")

        db.commit()

        # ── Create Permissions ──
        permissions_data = [
            ("admin:associate_lookup", "Access the Associate Lookup tool"),
            ("admin:manage_users", "Manage user roles and permissions"),
            ("admin:manage_connections", "Manage all users' connections"),
            ("admin:view_all_audit", "View audit logs for all users"),
            ("user:connections", "Manage own connections"),
            ("user:ingestion", "Run data ingestions"),
            ("user:audit", "View own audit logs"),
        ]
        for code, desc in permissions_data:
            existing = db.query(Permission).filter(Permission.code == code).first()
            if not existing:
                db.add(Permission(code=code, description=desc))
                print(f"  ✓ Permission created: {code}")
            else:
                print(f"  – Permission exists: {code}")

        db.commit()

        # ── Assign all permissions to admin role ──
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        all_perms = db.query(Permission).all()
        for perm in all_perms:
            exists = db.execute(
                role_permissions.select().where(
                    role_permissions.c.role_id == admin_role.id,
                    role_permissions.c.permission_id == perm.id,
                )
            ).first()
            if not exists:
                db.execute(role_permissions.insert().values(role_id=admin_role.id, permission_id=perm.id))
        db.commit()
        print("  ✓ Admin role has all permissions")

        # ── Assign user permissions to user role ──
        user_role = db.query(Role).filter(Role.name == "user").first()
        user_perms = db.query(Permission).filter(Permission.code.like("user:%")).all()
        for perm in user_perms:
            exists = db.execute(
                role_permissions.select().where(
                    role_permissions.c.role_id == user_role.id,
                    role_permissions.c.permission_id == perm.id,
                )
            ).first()
            if not exists:
                db.execute(role_permissions.insert().values(role_id=user_role.id, permission_id=perm.id))
        db.commit()
        print("  ✓ User role has user:* permissions")

        # ── Assign admin role to saideep.verma01@gmail.com ──
        from app.models.user import User

        admin_user = db.query(User).filter(User.email == "saideep.verma01@gmail.com").first()
        if admin_user:
            exists = db.execute(
                user_roles.select().where(
                    user_roles.c.user_id == admin_user.id,
                    user_roles.c.role_id == admin_role.id,
                )
            ).first()
            if not exists:
                db.execute(user_roles.insert().values(user_id=admin_user.id, role_id=admin_role.id))
                db.commit()
                print(f"  ✓ Admin role assigned to {admin_user.email}")
            else:
                print(f"  – {admin_user.email} already has admin role")
        else:
            print("  ⚠ User saideep.verma01@gmail.com not found — assign admin role manually later")

    finally:
        db.close()

    print("\n✅ RBAC migration complete.")


if __name__ == "__main__":
    seed()
