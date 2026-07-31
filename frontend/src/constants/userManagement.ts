/**
 * User Management Constants
 * Centralized configuration for the RBAC admin page.
 */

// ── API Endpoints ─────────────────────────────────────────────────────────────

/** Base path for RBAC admin endpoints */
export const RBAC_API_BASE = "/admin/rbac";

/** User-related endpoints */
export const API_USERS = `${RBAC_API_BASE}/users`;
export const API_ROLES = `${RBAC_API_BASE}/roles`;
export const API_CACHE_STATS = `${RBAC_API_BASE}/cache/stats`;
export const API_CACHE_INVALIDATE = `${RBAC_API_BASE}/cache/invalidate`;

// ── Timing Constants ──────────────────────────────────────────────────────────

/** Debounce delay for search input in milliseconds */
export const SEARCH_DEBOUNCE_MS = 300;

/** Duration to show toast messages in milliseconds */
export const TOAST_DISPLAY_DURATION_MS = 4000;

// ── UI Labels ─────────────────────────────────────────────────────────────────

export const LABELS = {
  PAGE_TITLE: "User Management",
  SECTION_USERS: "Users",
  SECTION_USER_DETAILS: "User Details",
  SECTION_ROLES: "Roles",
  SECTION_CACHE: "Permission Cache",
  SEARCH_PLACEHOLDER: "Search by email or name...",
  NO_USERS_FOUND: "No users found",
  NO_ROLES_ASSIGNED: "No roles assigned",
  ALL_ROLES_ASSIGNED: "User has all available roles",
  SELECT_USER_PROMPT: "Select a user to view details",
  SELECT_USER_DESCRIPTION: "Choose a user from the list to manage their roles and permissions",
  ASSIGNED_ROLES: "Assigned Roles",
  ADD_ROLE: "Add Role",
  EFFECTIVE_PERMISSIONS: "Effective Permissions",
  LAST_LOGIN: "Last login",
  REFRESH: "Refresh",
  CLEAR_ALL: "Clear All",
} as const;

// ── Cache Display ─────────────────────────────────────────────────────────────

export const CACHE_LABELS = {
  TYPE: "Type",
  CACHED_USERS: "Cached Users",
  TTL: "TTL",
  HIT_RATE: "Hit Rate",
} as const;

// ── Error Messages ────────────────────────────────────────────────────────────

export const ERRORS = {
  LOAD_USERS_FAILED: "Failed to load users",
  ASSIGN_ROLE_FAILED: "Failed to assign role",
  REVOKE_ROLE_FAILED: "Failed to revoke role",
  INVALIDATE_CACHE_FAILED: "Failed to invalidate cache",
} as const;

// ── Success Messages ──────────────────────────────────────────────────────────

export const MESSAGES = {
  CACHE_INVALIDATED_USER: "Cache invalidated for user",
  CACHE_INVALIDATED_ALL: "All caches invalidated",
} as const;
