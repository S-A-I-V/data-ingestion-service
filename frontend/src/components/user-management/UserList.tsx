/**
 * UserList — Searchable list of users with role badges.
 * Designed for sidebar layout (like Data Transfer steps sidebar).
 */

import { useState } from "react";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import { Spinner } from "../ui";
import { LABELS } from "../../constants/userManagement";
import type { UserData } from "../../types/userManagement";

interface UserListProps {
  users: UserData[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedUserId: string | null;
  onSelectUser: (user: UserData) => void;
}

export function UserList({
  users,
  loading,
  error,
  searchQuery,
  onSearchChange,
  selectedUserId,
  onSelectUser,
}: UserListProps) {
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [hoveredEmail, setHoveredEmail] = useState<string | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, email: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    });
    setHoveredEmail(email);
  };

  const handleMouseLeave = () => {
    setTooltipPos(null);
    setHoveredEmail(null);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
  };

  return (
    <div className="sidebar-card-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="sidebar-card-title">
        <h2 className="font-sans text-[13px] font-medium leading-[1.2] tracking-[-0.02em] text-neutral-900 flex items-center gap-2">
          <PersonIcon sx={{ fontSize: 16 }} /> {LABELS.SECTION_USERS} ({users.length})
        </h2>
      </div>

      {/* Search */}
      <div className="um-search">
        <SearchIcon sx={{ fontSize: 14, opacity: 0.5 }} />
        <input
          type="text"
          placeholder={LABELS.SEARCH_PLACEHOLDER}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* User List */}
      <div className="um-users-list sidebar-card-list">
        {loading ? (
          <div className="um-loading">
            <Spinner size="sm" label="Loading users..." />
          </div>
        ) : error ? (
          <div className="um-error">{error}</div>
        ) : users.length === 0 ? (
          <div className="um-empty">{LABELS.NO_USERS_FOUND}</div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className={`um-user-item lf-corners-hover ${selectedUserId === user.id ? "um-user-selected" : ""}`}
              onClick={() => onSelectUser(user)}
              onMouseEnter={(e) => handleMouseEnter(e, user.email)}
              onMouseLeave={handleMouseLeave}
              role="button"
              tabIndex={0}
            >
              <div className="um-user-avatar">
                {user.picture ? <img src={user.picture} alt="" /> : <PersonIcon sx={{ fontSize: 16 }} />}
              </div>
              <div className="um-user-info">
                <div className="um-user-email">{user.email}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Fixed position tooltip */}
      {tooltipPos && hoveredEmail && (
        <div
          className="um-user-email-full um-user-email-full--visible"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: "translateY(-50%)",
          }}
          onClick={() => handleCopyEmail(hoveredEmail)}
          title="Click to copy"
        >
          {hoveredEmail}
        </div>
      )}
    </div>
  );
}
