/**
 * RolesPanel — Displays all available roles with user/permission counts.
 * Designed for right sidebar layout.
 */

import GroupIcon from "@mui/icons-material/Group";
import { Spinner } from "../ui";
import { LABELS } from "../../constants/userManagement";
import type { RoleData } from "../../types/userManagement";

interface RolesPanelProps {
  roles: RoleData[];
  loading: boolean;
}

export function RolesPanel({ roles, loading }: RolesPanelProps) {
  return (
    <div className="sidebar-card">
      <div className="sidebar-card-content">
        <div className="sidebar-card-title">
          <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900 flex items-center gap-2">
            <GroupIcon sx={{ fontSize: 16 }} /> {LABELS.SECTION_ROLES}
          </h2>
        </div>

        <div className="sidebar-card-list sidebar-card-list--loose">
          {loading ? (
            <div className="um-loading">
              <Spinner size="sm" label="Loading..." />
            </div>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="um-role-item lf-corners-hover">
                <div className="um-role-name">{role.name}</div>
                <div className="um-role-meta">
                  {role.permission_count} perms · {role.user_count} users
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
