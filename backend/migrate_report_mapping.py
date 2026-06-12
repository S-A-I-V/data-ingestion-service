"""
Migration: Create saved_report_mappings table and add RBAC permission.

Run with: python3 migrate_report_mapping.py
"""

from app.database import Base, SessionLocal, engine
from app.models.report_mapping import SavedReportMapping  # noqa: F401

# Create the table
Base.metadata.create_all(bind=engine, tables=[SavedReportMapping.__table__])
print("  \u2713 Created saved_report_mappings table")


def seed_permission():
    db = SessionLocal()
    try:
        from app.models.rbac import Permission, Role, role_permissions

        # Add the permission
        code = "admin:report_mapping"
        existing = db.query(Permission).filter(Permission.code == code).first()
        if not existing:
            perm = Permission(code=code, description="Access the Report Job Mapping tool")
            db.add(perm)
            db.commit()
            db.refresh(perm)
            print(f"  \u2713 Permission created: {code}")

            # Assign to admin role
            admin_role = db.query(Role).filter(Role.name == "admin").first()
            if admin_role:
                db.execute(role_permissions.insert().values(role_id=admin_role.id, permission_id=perm.id))
                db.commit()
                print("  \u2713 Assigned to admin role")
        else:
            print(f"  \u2013 Permission exists: {code}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_permission()
    print("\n\u2705 Report mapping migration complete.")
