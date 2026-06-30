/**
 * Constants for the Report Health Dashboard.
 *
 * DATE CONTEXT (from nfc_prod schema):
 *   data_date       — the day the data covers (e.g. 2026-06-20)
 *   delivery_date   — the day the report is scheduled to be delivered to clients
 *   coverage_start_date / coverage_end_date — the multi-day window a L+7 report covers
 *
 * The primary filter is delivery_date — "what is due today/on a given day".
 * data_date is shown per-job since a L+7 report has 8 data_dates per window.
 */

export const REPORT_HEALTH_PERMISSION = "admin:report_health" as const;

/** Auto-refresh interval. 0 = disabled. */
export const REPORT_HEALTH_POLL_INTERVAL_MS = 60_000 as const;

/** delay_status → display meta */
export const DELAY_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  on_track: {
    label: "On Track",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
  },
  internal_delayed: {
    label: "Internal Delay",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
  },
  client_delayed: {
    label: "Client Delayed",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
  },
  unknown_state: {
    label: "Unknown",
    color: "#52525b",
    bg: "rgba(82,82,91,0.12)",
  },
};

/** delivery_status / job current_status → display meta */
export const JOB_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  success: { label: "Success", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  in_progress: { label: "In Progress", color: "#0fb1b2", bg: "rgba(15,177,178,0.12)" },
  running: { label: "Running", color: "#0fb1b2", bg: "rgba(15,177,178,0.12)" },
  scheduled: { label: "Scheduled", color: "#52525b", bg: "rgba(82,82,91,0.12)" },
  failed: { label: "Failed", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  error: { label: "Error", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

/** message_source field values → human label */
export const MESSAGE_SOURCE_LABELS: Record<string, string> = {
  self: "Direct",
  proxy: "Proxy",
  INFERRED: "Inferred",
  UI: "Manual UI",
};

/** run_requirement_mode field values */
export const RUN_MODE_LABELS: Record<string, string> = {
  PER_DATA_DATE: "Per Date",
  ONCE_PER_WINDOW: "Once/Window",
};

/** Tabs in the detail drawer */
export const DRAWER_TAB = {
  OVERVIEW: "overview",
  JOBS: "jobs",
  TIMELINE: "timeline",
} as const;

/** Status filter options — filters on report_delivery_status + report_delay_status */
export const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "delayed", label: "Delayed" },
  { value: "in_progress", label: "In Progress" },
  { value: "success", label: "Done" },
  { value: "scheduled", label: "Scheduled" },
] as const;

/** Sentinel value used in the app_name filter <select> for "no filter applied" */
export const APP_FILTER_ALL_VALUE = "__ALL__" as const;
