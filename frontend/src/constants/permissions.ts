/**
 * Permission codes for RBAC enforcement.
 * These must match the backend permission codes in migrate_rbac.py
 */

// ── Connection management ────────────────────────────────────────────────────

/** Permission code for creating, editing, and deleting database connections */
export const PERM_ADMIN_CONNECTIONS = "admin:connections";

/** Permission code for viewing database connections list */
export const PERM_ADMIN_CONNECTIONS_VIEW = "admin:connections:view";

/** Permission code for testing database connections */
export const PERM_ADMIN_CONNECTIONS_TEST = "admin:connections:test";

// ── Data transfer / ingestion ────────────────────────────────────────────────

/** Permission code for executing data transfer/ingestion */
export const PERM_ADMIN_DATA_TRANSFER = "admin:data_transfer";

/** Permission code for previewing CSV uploads */
export const PERM_ADMIN_DATA_TRANSFER_PREVIEW = "admin:data_transfer:preview";

// ── Audit access ─────────────────────────────────────────────────────────────

/** Permission code for viewing and exporting audit logs */
export const PERM_ADMIN_AUDIT = "admin:audit";

/** Permission code for exporting audit logs to CSV */
export const PERM_ADMIN_AUDIT_EXPORT = "admin:audit:export";

// ── Admin tools ──────────────────────────────────────────────────────────────

/** Permission code for accessing Associate Lookup tool */
export const PERM_ADMIN_ASSOCIATE_LOOKUP = "admin:associate_lookup";

/** Permission code for managing user roles and permissions */
export const PERM_ADMIN_MANAGE_USERS = "admin:manage_users";

/** Permission code for viewing all users' audit logs */
export const PERM_ADMIN_VIEW_ALL_AUDIT = "admin:view_all_audit";

// ── Report & Job management (NFC Prod tools) ─────────────────────────────────

/** Permission code for managing report-to-job mappings */
export const PERM_ADMIN_REPORT_MAPPING = "admin:report_mapping";

/** Permission code for managing report definitions and SLA policies */
export const PERM_ADMIN_REPORT_POLICIES = "admin:report_policies";

/** Permission code for viewing report health dashboard */
export const PERM_ADMIN_REPORT_HEALTH = "admin:report_health";

/** Permission code for onboarding clients, groups, and business entities */
export const PERM_ADMIN_CLIENT_ONBOARDING = "admin:client_onboarding";

/** Permission code for onboarding and managing job definitions */
export const PERM_ADMIN_JOB_ONBOARDING = "admin:job_onboarding";

// ── AI analysis ──────────────────────────────────────────────────────────────

/** Permission code for using AI-powered query analysis */
export const PERM_ADMIN_AI_ANALYSIS = "admin:ai_analysis";

/**
 * All admin-level permissions grouped by feature area.
 * Used for checking if user has access to a feature section.
 */
export const PERMISSION_GROUPS = {
  /** Permissions needed for the Ingest page */
  INGEST: [PERM_ADMIN_CONNECTIONS_VIEW, PERM_ADMIN_DATA_TRANSFER_PREVIEW, PERM_ADMIN_DATA_TRANSFER],
  /** Permissions needed to manage connections */
  CONNECTIONS: [PERM_ADMIN_CONNECTIONS, PERM_ADMIN_CONNECTIONS_VIEW, PERM_ADMIN_CONNECTIONS_TEST],
  /** Permissions needed for audit dashboard */
  AUDIT: [PERM_ADMIN_AUDIT, PERM_ADMIN_AUDIT_EXPORT],
  /** Permissions needed for Associate Lookup */
  ASSOCIATE_LOOKUP: [PERM_ADMIN_ASSOCIATE_LOOKUP],
  /** Permissions needed for Report Mapping */
  REPORT_MAPPING: [PERM_ADMIN_REPORT_MAPPING],
  /** Permissions needed for Report Policies */
  REPORT_POLICIES: [PERM_ADMIN_REPORT_POLICIES],
  /** Permissions needed for Report Health Dashboard */
  REPORT_HEALTH: [PERM_ADMIN_REPORT_HEALTH],
  /** Permissions needed for Client Onboarding */
  CLIENT_ONBOARDING: [PERM_ADMIN_CLIENT_ONBOARDING],
  /** Permissions needed for Job Onboarding */
  JOB_ONBOARDING: [PERM_ADMIN_JOB_ONBOARDING],
} as const;
