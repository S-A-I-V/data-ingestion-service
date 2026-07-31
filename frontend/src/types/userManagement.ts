/**
 * User Management Types
 * Shared type definitions for RBAC admin components.
 */

/** Role assigned to a user */
export interface UserRole {
  id: number;
  name: string;
  description?: string;
}

/** User data from the RBAC API */
export interface UserData {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: string | null;
  last_login: string | null;
  roles: UserRole[];
  permissions?: string[];
}

/** Role definition from the RBAC API */
export interface RoleData {
  id: number;
  name: string;
  description: string | null;
  permission_count: number;
  user_count: number;
}

/** Permission cache statistics */
export interface CacheStats {
  type: string;
  size: number;
  max_size?: number;
  ttl_seconds: number;
  hits?: number;
  misses?: number;
  hit_rate_percent?: number;
}
