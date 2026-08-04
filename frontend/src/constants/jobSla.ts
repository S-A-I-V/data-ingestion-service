/**
 * Constants for the Job SLA Analyzer dashboard.
 * All magic numbers and config values should be defined here.
 */

// ── API Configuration ────────────────────────────────────────────────────────

/** Base URL for Job SLA API endpoints (no /api prefix - handled by axios baseURL) */
export const JOB_SLA_API_BASE = "/admin/job-sla";

/** Maximum events to fetch in history queries */
export const MAX_EVENT_HISTORY_LIMIT = 2000;

/** Default bucket size for duration distribution histogram (minutes) */
export const DEFAULT_DURATION_BUCKET_SIZE_MINUTES = 5;

// ── Permission ───────────────────────────────────────────────────────────────

/** Required RBAC permission to access Job SLA Analyzer */
export const JOB_SLA_PERMISSION = "admin:job_sla_analyzer";

// ── UI Configuration ─────────────────────────────────────────────────────────

/** Debounce delay for job search input (milliseconds) */
export const JOB_SEARCH_DEBOUNCE_MS = 300;

/** Auto-refresh interval for live data (milliseconds), 0 = disabled */
export const AUTO_REFRESH_INTERVAL_MS = 0;

/** Number of items per page in paginated lists */
export const ITEMS_PER_PAGE = 50;

// ── Status Colors ────────────────────────────────────────────────────────────

/** CSS class suffixes for job status badges */
export const STATUS_COLORS: Record<string, string> = {
  success: "success",
  running: "info",
  failed: "danger",
  pending: "warning",
  unknown: "muted",
};

/** CSS class suffixes for delay status badges */
export const DELAY_STATUS_COLORS: Record<string, string> = {
  on_time: "success",
  late: "warning",
  client_delayed: "danger",
  internal_delayed: "danger",
  delayed: "danger",
  running: "info",
  unknown: "muted",
};

/** CSS class suffixes for compliance status in heatmap */
export const COMPLIANCE_COLORS: Record<string, string> = {
  on_time: "green",
  late: "amber",
  delayed: "red",
  failed: "red",
};

// ── Job Type Labels ──────────────────────────────────────────────────────────

/** Human-readable labels for job types */
export const JOB_TYPE_LABELS: Record<string, string> = {
  standard: "Standard Job",
  artifact: "Artifact Job",
  proxy: "Proxy Job",
  artifact_proxy: "Artifact + Proxy Job",
};

/** Descriptions for job types shown in tooltips */
export const JOB_TYPE_DESCRIPTIONS: Record<string, string> = {
  standard: "Regular pipeline job with direct status tracking",
  artifact: "Job with artifact file dependencies that must arrive before completion",
  proxy: "Job whose status is inferred from other trigger jobs",
  artifact_proxy: "Job with both artifact dependencies and proxy inference rules",
};

// ── Day of Week Labels ───────────────────────────────────────────────────────

/** Day of week labels for heatmap (0=Sunday per JS Date) */
export const DAY_OF_WEEK_LABELS: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Full day of week labels */
export const DAY_OF_WEEK_LABELS_FULL: string[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ── Hour Labels ──────────────────────────────────────────────────────────────

/** Hour labels for heatmap Y-axis */
export const HOUR_LABELS: string[] = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

// ── Chart Configuration ──────────────────────────────────────────────────────

/** Colors for chart series */
export const CHART_COLORS = {
  onTime: "#22c55e", // green-500
  late: "#f59e0b", // amber-500
  delayed: "#ef4444", // red-500
  failed: "#dc2626", // red-600
  running: "#3b82f6", // blue-500
  total: "#6b7280", // gray-500
} as const;

/** Heatmap color scale (low to high intensity) */
export const HEATMAP_COLOR_SCALE = [
  "#f0fdf4", // green-50
  "#dcfce7", // green-100
  "#bbf7d0", // green-200
  "#86efac", // green-300
  "#4ade80", // green-400
  "#22c55e", // green-500
] as const;

/** Heatmap color scale for delays (low to high) */
export const HEATMAP_DELAY_COLOR_SCALE = [
  "#fef2f2", // red-50
  "#fee2e2", // red-100
  "#fecaca", // red-200
  "#fca5a5", // red-300
  "#f87171", // red-400
  "#ef4444", // red-500
] as const;

// ── Table Column Definitions ─────────────────────────────────────────────────

/** Column labels for job live state history table */
export const HISTORY_COLUMN_LABELS: Record<string, string> = {
  data_date: "Data Date",
  current_status: "Status",
  delay_status: "Delay Status",
  delay_duration_minutes: "Delay (min)",
  start_time: "Start Time",
  end_time: "End Time",
  expected_start_time: "Expected Start",
  job_expected_sla: "SLA Deadline",
  observed_duration_seconds: "Duration",
  sev1_numbers: "SEV1",
  client_name: "Client",
};

/** Column labels for event history table */
export const EVENT_COLUMN_LABELS: Record<string, string> = {
  event_timestamp: "Timestamp",
  status: "Status",
  completion_percent: "Progress",
  source: "Source",
  run_id: "Run ID",
  orchestrator_name: "Orchestrator",
};

/** Column labels for artifact table */
export const ARTIFACT_COLUMN_LABELS: Record<string, string> = {
  actual_filename: "Filename",
  data_date: "Data Date",
  status: "Status",
  received_time: "Received",
  release_time: "Released",
  completion_percent: "Progress",
};

/** Column labels for incident table */
export const INCIDENT_COLUMN_LABELS: Record<string, string> = {
  data_date: "Data Date",
  sev1_number: "SEV1 #",
  created_at: "Created",
  created_by: "Created By",
};

// ── Trend Timezone Options ───────────────────────────────────────────────────

/**
 * Timezone options available in the SLA trend chart timezone picker.
 * label  — display text shown in the dropdown
 * value  — IANA timezone string passed to Intl / toLocaleString
 * offset — UTC offset in minutes (used to shift minutes-from-midnight values
 *           that the backend always returns in UTC)
 */
export const TREND_TIMEZONE_OPTIONS: { label: string; value: string; offsetMinutes: number }[] = [
  { label: "UTC", value: "UTC", offsetMinutes: 0 },
  { label: "ET (UTC-5/4)", value: "America/New_York", offsetMinutes: -300 },
  { label: "CT (UTC-6/5)", value: "America/Chicago", offsetMinutes: -360 },
  { label: "MT (UTC-7/6)", value: "America/Denver", offsetMinutes: -420 },
  { label: "PT (UTC-8/7)", value: "America/Los_Angeles", offsetMinutes: -480 },
  { label: "IST (UTC+5:30)", value: "Asia/Kolkata", offsetMinutes: 330 },
  { label: "CET (UTC+1/2)", value: "Europe/Paris", offsetMinutes: 60 },
  { label: "Local", value: "__local__", offsetMinutes: -new Date().getTimezoneOffset() },
];

/** Default timezone for the trend chart */
export const TREND_DEFAULT_TIMEZONE = "UTC";

// ── Tab Configuration ────────────────────────────────────────────────────────

/** Available tabs in Job SLA Analyzer */
export const JOB_SLA_TABS = [
  { id: "overview", label: "Overview" },
  { id: "heatmap", label: "Heatmap" },
  { id: "history", label: "History" },
] as const;

/** Additional tabs shown for artifact jobs */
export const ARTIFACT_TAB = { id: "artifacts", label: "Artifacts" } as const;

/** Additional tabs shown for proxy jobs */
export const PROXY_TAB = { id: "proxy", label: "Proxy Rules" } as const;

// ── KPI Thresholds ───────────────────────────────────────────────────────────

/** On-time percentage threshold for "good" status (green) */
export const ON_TIME_PERCENTAGE_GOOD_THRESHOLD = 95;

/** On-time percentage threshold for "warning" status (amber) */
export const ON_TIME_PERCENTAGE_WARNING_THRESHOLD = 80;

/** Average delay threshold for "good" status in minutes */
export const AVG_DELAY_GOOD_THRESHOLD_MINUTES = 15;

/** Average delay threshold for "warning" status in minutes */
export const AVG_DELAY_WARNING_THRESHOLD_MINUTES = 60;
