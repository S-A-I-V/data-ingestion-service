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
            # Admin-level permissions (full access)
            ("admin:associate_lookup", "Access the Associate Lookup tool"),
            ("admin:manage_users", "Manage user roles and permissions"),
            ("admin:view_all_audit", "View audit logs for all users"),
            # Connection management
            ("admin:connections", "Create, edit, delete database connections"),
            ("admin:connections:view", "View database connections list"),
            ("admin:connections:test", "Test database connections"),
            # Data transfer / ingestion
            ("admin:data_transfer", "Execute CSV data ingestion and transfers"),
            ("admin:data_transfer:preview", "Preview CSV uploads before ingestion"),
            # Audit access
            ("admin:audit", "View and export all audit logs"),
            ("admin:audit:export", "Export audit logs to CSV"),
            # Report & Job management (NFC Prod tools)
            ("admin:report_mapping", "Manage report-to-job mappings"),
            ("admin:report_policies", "Manage report definitions and SLA policies"),
            ("admin:report_health", "View report health dashboard"),
            ("admin:client_onboarding", "Onboard clients, groups, and business entities"),
            ("admin:job_onboarding", "Onboard and manage job definitions"),
            # AI analysis
            ("admin:ai_analysis", "Use AI-powered query analysis"),
            # Legacy user-level (kept for backward compatibility)
            ("user:connections", "Manage own connections (deprecated)"),
            ("user:ingestion", "Run data ingestions (deprecated)"),
            ("user:audit", "View own audit logs (deprecated)"),
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

        # ── Assign admin role to the configured admin email ──
        import os

        from app.models.user import User

        admin_email = os.environ.get("INITIAL_ADMIN_EMAIL", "")
        if not admin_email:
            print("  ⚠ INITIAL_ADMIN_EMAIL not set — skip admin role assignment (set it in .env)")
        else:
            admin_user = db.query(User).filter(User.email == admin_email).first()
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
                print(f"  ⚠ User {admin_email} not found — register first, then re-run")

    finally:
        db.close()

    print("\n✅ RBAC migration complete.")


if __name__ == "__main__":
    seed()
