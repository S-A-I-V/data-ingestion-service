/**
 * Constants for the Report Policies admin feature.
 */

/** Steps in the report policy edit wizard */
export const POLICY_EDIT_STEPS = [
  { label: "Select", description: "Choose report" },
  { label: "View / Edit", description: "Modify policies" },
  { label: "Preview", description: "Review SQL changes" },
  { label: "Confirm", description: "Apply to Prod" },
] as const;

/** Icon sizes */
export const TOOLBAR_ICON_SIZE_PX = 14;

/** Days of week options for SLA policies */
export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** Schedule frequency options */
export const SCHEDULE_FREQUENCIES = ["daily", "weekly", "monthly"] as const;

/** Window mode options */
export const WINDOW_MODES = ["SINGLE_DATE", "DELIVERY_WINDOW", "ROLLING"] as const;

/** Timezone options with labels */
export const TIMEZONES = [
  "EST",
  "CST",
  "MST",
  "PST",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Kolkata",
  "local",
] as const;
