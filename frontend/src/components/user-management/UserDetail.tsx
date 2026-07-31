/**
 * UserDetail — Shows selected user info, roles, and permissions.
 */

import { useState } from "react";
import PersonIcon from "@mui/icons-material/Person";
import SecurityIcon from "@mui/icons-material/Security";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Spinner, Panel, PanelHeader, EmptyState } from "../ui";
import { LABELS } from "../../constants/userManagement";
import type { UserData, RoleData } from "../../types/userManagement";

interface UserDetailProps {
  user: UserData | null;
  loading: boolean;
  allRoles: RoleData[];
  onAssignRole: (userId: string, roleId: number) => void;
  onRevokeRole: (userId: string, roleId: number) => void;
}

export function UserDetail({ user, loading, allRoles, onAssignRole, onRevokeRole }: UserDetailProps) {
  const [hoveredRole, setHoveredRole] = useState<number | null>(null);
  const [roleTooltipPos, setRoleTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const handleRoleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, roleId: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRoleTooltipPos({
      top: rect.bottom + 8,
      left: rect.left,
    });
    setHoveredRole(roleId);
  };

  const handleRoleMouseLeave = () => {
    setHoveredRole(null);
    setRoleTooltipPos(null);
  };

  if (!user) {
    return (
      <Panel className="um-detail-panel um-no-selection">
        <EmptyState
          icon={<PersonIcon sx={{ fontSize: 48 }} />}
          title={LABELS.SELECT_USER_PROMPT}
          description={LABELS.SELECT_USER_DESCRIPTION}
        />
      </Panel>
    );
  }

  const availableRoles = allRoles.filter((r) => !user.roles.some((ur) => ur.id === r.id));

  const hoveredRoleData = hoveredRole ? allRoles.find((r) => r.id === hoveredRole) : null;

  return (
    <Panel className="um-detail-panel">
      <PanelHeader>
        <SecurityIcon sx={{ fontSize: 16 }} /> {LABELS.SECTION_USER_DETAILS}
      </PanelHeader>

      {loading ? (
        <div className="um-loading">
          <Spinner size="sm" label="Loading..." />
        </div>
      ) : (
        <div className="um-user-detail">
          {/* User Header */}
          <div className="um-detail-header">
            <div className="um-detail-avatar">
              {user.picture ? <img src={user.picture} alt="" /> : <PersonIcon sx={{ fontSize: 32 }} />}
            </div>
            <div className="um-detail-info">
              <div className="um-detail-name">{user.name || user.email.split("@")[0]}</div>
              <div className="um-detail-email">{user.email}</div>
              {user.last_login && (
                <div className="um-detail-meta">
                  {LABELS.LAST_LOGIN}: {new Date(user.last_login).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Assigned Roles */}
          <div className="um-section">
            <div className="um-section-title">{LABELS.ASSIGNED_ROLES}</div>
            <div className="um-role-chips">
              {user.roles.length === 0 ? (
                <span className="um-empty-inline">{LABELS.NO_ROLES_ASSIGNED}</span>
              ) : (
                user.roles.map((role) => (
                  <div key={role.id} className="um-role-chip">
                    <span>{role.name}</span>
                    <button
                      type="button"
                      className="um-chip-remove"
                      onClick={() => onRevokeRole(user.id, role.id)}
                      title="Revoke role"
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Role */}
          <div className="um-section">
            <div className="um-section-title">
              {LABELS.ADD_ROLE}
              <span className="um-section-hint">
                <InfoOutlinedIcon sx={{ fontSize: 12 }} /> Hover to see permissions
              </span>
            </div>
            <div className="um-add-role">
              {availableRoles.length === 0 ? (
                <span className="um-empty-inline">{LABELS.ALL_ROLES_ASSIGNED}</span>
              ) : (
                availableRoles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    className="btn btn-sm um-add-role-btn"
                    onClick={() => onAssignRole(user.id, role.id)}
                    onMouseEnter={(e) => handleRoleMouseEnter(e, role.id)}
                    onMouseLeave={handleRoleMouseLeave}
                  >
                    <AddIcon sx={{ fontSize: 12 }} /> {role.name}
                    <span className="um-role-perm-count">({role.permission_count})</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Role permissions tooltip */}
          {hoveredRoleData && roleTooltipPos && (
            <div
              className="um-role-tooltip"
              style={{
                top: roleTooltipPos.top,
                left: roleTooltipPos.left,
              }}
            >
              <div className="um-role-tooltip-header">
                <strong>{hoveredRoleData.name}</strong> grants {hoveredRoleData.permission_count} permissions
              </div>
              <div className="um-role-tooltip-hint">Click to assign this role</div>
            </div>
          )}

          {/* Effective Permissions */}
          {user.permissions && user.permissions.length > 0 && (
            <div className="um-section">
              <div className="um-section-title">
                {LABELS.EFFECTIVE_PERMISSIONS} ({user.permissions.length})
              </div>
              <div className="um-permissions-list">
                {user.permissions.map((perm) => (
                  <code key={perm} className="um-perm-code">
                    {perm}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
