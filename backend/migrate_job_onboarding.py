"""
Migration: Add 'admin:job_onboarding' permission to RBAC.

This permission controls access to the Job Onboarding admin tool,
which manages:
  - job_definitions (create, edit, soft-delete)
  - sla_policies for jobs
  - job_proxy_inference_rules
  - artifact_definitions

Run with: python3 migrate_job_onboarding.py
"""

from app.database import SessionLocal


def seed_permission():
    db = SessionLocal()
    try:
        from app.models.rbac import Permission, Role, role_permissions

        # Add the permission
        code = "admin:job_onboarding"
        existing = db.query(Permission).filter(Permission.code == code).first()
        if not existing:
            perm = Permission(
                code=code,
                description="Access the Job Onboarding tool (create, edit, delete jobs + SLA + proxy rules)",
            )
            db.add(perm)
            db.commit()
            db.refresh(perm)
            print(f"  ✓ Permission created: {code}")

            # Assign to admin role
            admin_role = db.query(Role).filter(Role.name == "admin").first()
            if admin_role:
                db.execute(role_permissions.insert().values(role_id=admin_role.id, permission_id=perm.id))
                db.commit()
                print("  ✓ Assigned to admin role")
        else:
            print(f"  – Permission exists: {code}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_permission()
    print("\n✅ Job onboarding permission migration complete.")
