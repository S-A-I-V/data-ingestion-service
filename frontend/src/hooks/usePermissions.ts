/**
 * Hook for checking user permissions in the frontend.
 * Fetches permissions from /api/auth/me and provides utility functions.
 */

import { useCallback, useEffect, useState } from "react";
import api from "../api";

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
  permissions: string[];
}

interface UsePermissionsResult {
  /** Current user data including permissions */
  user: User | null;
  /** Array of permission codes the user has */
  permissions: string[];
  /** Whether permissions are still loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
  /** Check if user has ANY of the given permissions */
  hasAnyPermission: (permissions: string[]) => boolean;
  /** Check if user has ALL of the given permissions */
  hasAllPermissions: (permissions: string[]) => boolean;
  /** Refetch user data and permissions */
  refetch: () => Promise<void>;
}

/**
 * Hook to manage user permissions throughout the app.
 *
 * @example
 * ```tsx
 * const { hasPermission, loading } = usePermissions();
 *
 * if (loading) return <Spinner />;
 * if (!hasPermission('admin:connections')) return <AccessDenied />;
 *
 * return <ConnectionManager />;
 * ```
 */
export function usePermissions(): UsePermissionsResult {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      setUser(null);
      setPermissions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get<User>("/auth/me");
      setUser(response.data);
      setPermissions(response.data.permissions || []);
    } catch (err) {
      setError("Failed to fetch user permissions");
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return permissions.includes(permission);
    },
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (perms: string[]): boolean => {
      return perms.some((p) => permissions.includes(p));
    },
    [permissions],
  );

  const hasAllPermissions = useCallback(
    (perms: string[]): boolean => {
      return perms.every((p) => permissions.includes(p));
    },
    [permissions],
  );

  return {
    user,
    permissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch: fetchPermissions,
  };
}

export default usePermissions;
