/**
 * UserManagement — Admin page for managing user roles and permissions.
 *
 * Features:
 *   - List all users with their roles
 *   - Search/filter users
 *   - View user details with effective permissions
 *   - Assign/revoke roles
 *   - View role details and permissions
 *   - Cache statistics
 */

import { useState, useEffect, useCallback } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../api";
import { useToast } from "../components/ui";
import Highlight from "../components/ui/Highlight";
import { UserList, UserDetail, RolesPanel, CacheStatsPanel } from "../components/user-management";
import {
  API_USERS,
  API_ROLES,
  API_CACHE_STATS,
  API_CACHE_INVALIDATE,
  SEARCH_DEBOUNCE_MS,
  LABELS,
  ERRORS,
  MESSAGES,
} from "../constants/userManagement";
import type { UserData, RoleData, CacheStats } from "../types/userManagement";

export default function UserManagement() {
  const { showToast } = useToast();

  // Users state
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Selected user
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  // Roles state
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Cache stats
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get(API_USERS, { params });
      setUsers(res.data.users);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setUsersError(err.response?.data?.detail || ERRORS.LOAD_USERS_FAILED);
    } finally {
      setUsersLoading(false);
    }
  }, [debouncedSearch]);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await api.get(API_ROLES);
      setRoles(res.data.roles);
    } catch {
      // Silent fail — roles panel will show empty
    } finally {
      setRolesLoading(false);
    }
  }, []);

  // Fetch cache stats
  const fetchCacheStats = useCallback(async () => {
    try {
      const res = await api.get(API_CACHE_STATS);
      setCacheStats(res.data);
    } catch {
      // Silent fail
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchCacheStats();
  }, [fetchUsers, fetchRoles, fetchCacheStats]);

  // Refetch users when search changes
  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, fetchUsers]);

  // Select user and load details
  const handleSelectUser = async (user: UserData) => {
    setSelectedUser(user);
    setUserDetailLoading(true);
    try {
      const res = await api.get(`${API_USERS}/${user.id}`);
      setSelectedUser(res.data);
    } catch {
      // Keep basic user data if detail fetch fails
    } finally {
      setUserDetailLoading(false);
    }
  };

  // Assign role to user
  const handleAssignRole = async (userId: string, roleId: number) => {
    try {
      const res = await api.post(`${API_USERS}/${userId}/roles`, { role_id: roleId });
      showToast({ type: "success", message: res.data.message });
      // Refresh user details and list
      if (selectedUser?.id === userId) {
        handleSelectUser({ ...selectedUser } as UserData);
      }
      fetchUsers();
      fetchRoles();
      fetchCacheStats();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      showToast({ type: "error", message: err.response?.data?.detail || ERRORS.ASSIGN_ROLE_FAILED });
    }
  };

  // Revoke role from user
  const handleRevokeRole = async (userId: string, roleId: number) => {
    try {
      const res = await api.delete(`${API_USERS}/${userId}/roles/${roleId}`);
      showToast({ type: "success", message: res.data.message });
      // Refresh user details and list
      if (selectedUser?.id === userId) {
        handleSelectUser({ ...selectedUser } as UserData);
      }
      fetchUsers();
      fetchRoles();
      fetchCacheStats();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      showToast({ type: "error", message: err.response?.data?.detail || ERRORS.REVOKE_ROLE_FAILED });
    }
  };

  // Invalidate cache
  const handleInvalidateCache = async () => {
    try {
      await api.post(API_CACHE_INVALIDATE, { user_id: null });
      showToast({ type: "success", message: MESSAGES.CACHE_INVALIDATED_ALL });
      fetchCacheStats();
    } catch {
      showToast({ type: "error", message: ERRORS.INVALIDATE_CACHE_FAILED });
    }
  };

  const handleRefreshAll = () => {
    fetchUsers();
    fetchRoles();
    fetchCacheStats();
  };

  return (
    <div
      className="lf-layout"
      style={{ gridTemplateColumns: "var(--sidebar-left-width) 1fr var(--sidebar-right-width)" }}
    >
      {/* LEFT SIDEBAR — Users List */}
      <aside className="lf-sidebar-left">
        <div className="sidebar-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <UserList
            users={users}
            loading={usersLoading}
            error={usersError}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedUserId={selectedUser?.id ?? null}
            onSelectUser={handleSelectUser}
          />
        </div>
      </aside>

      {/* CENTER — User Details */}
      <main className="lf-main">
        <div style={{ width: "100%" }}>
          <div className="toolbar">
            <span className="toolbar-title">
              <Highlight>{LABELS.PAGE_TITLE}</Highlight>
            </span>
            <div className="toolbar-spacer" />
            <button type="button" className="btn btn-sm" onClick={handleRefreshAll}>
              <RefreshIcon sx={{ fontSize: 14 }} /> {LABELS.REFRESH}
            </button>
          </div>

          <UserDetail
            user={selectedUser}
            loading={userDetailLoading}
            allRoles={roles}
            onAssignRole={handleAssignRole}
            onRevokeRole={handleRevokeRole}
          />
        </div>
      </main>

      {/* RIGHT SIDEBAR — Roles & Cache */}
      <aside className="lf-sidebar-right">
        <RolesPanel roles={roles} loading={rolesLoading} />
        <div style={{ marginTop: "1rem" }}>
          <CacheStatsPanel stats={cacheStats} onInvalidateAll={handleInvalidateCache} />
        </div>
      </aside>
    </div>
  );
}
