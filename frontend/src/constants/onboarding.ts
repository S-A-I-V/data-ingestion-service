/**
 * Constants for Client Onboarding and Client Edit pages.
 */
import type { Step } from "../components/onboarding/StepProgress";

// ── Session Storage Cache Keys ───────────────────────────────────────────────
/** Cache key for the next available IDs (client, group, detail, crm) */
export const CACHE_KEY_NEXT_IDS = "onboarding_next_ids";

/** Cache key for report definitions */
export const CACHE_KEY_REPORTS = "onboarding_reports";

// ── Validation ───────────────────────────────────────────────────────────────
/** Minimum character length for client/group names */
export const MIN_NAME_LENGTH = 2;

// ── New Client Onboarding Steps ──────────────────────────────────────────────
export const NEW_CLIENT_STEPS: Step[] = [
  { label: "Client", description: "Name & ID" },
  { label: "Group", description: "Group Setup" },
  { label: "BEIDs", description: "Entity mapping" },
  { label: "Reports", description: "Report mapping" },
  { label: "Fastie", description: "Aliases (optional)" },
  { label: "Review", description: "Preview & confirm" },
];

// ── Edit Client Steps ────────────────────────────────────────────────────────
export const EDIT_CLIENT_STEPS: Step[] = [
  { label: "Group", description: "Group name" },
  { label: "BEIDs", description: "Entity mapping" },
  { label: "Reports", description: "Report mapping" },
  { label: "Fastie", description: "Aliases (optional)" },
  { label: "Review", description: "Diff & confirm" },
];

// ── Icon Sizes ───────────────────────────────────────────────────────────────
/** Icon size for navigation buttons in onboarding */
export const NAV_ICON_SIZE_PX = 16;

/** Icon size for toolbar buttons */
export const TOOLBAR_ICON_SIZE_PX = 14;

/** Icon size for success state */
export const SUCCESS_ICON_SIZE_PX = 56;

// ── Fastie Alias Step Index (for skip logic) ─────────────────────────────────
/** Step index for the Fastie alias step in new client flow */
export const NEW_CLIENT_FASTIE_STEP_INDEX = 4;

/** Step index for the Fastie alias step in edit client flow */
export const EDIT_CLIENT_FASTIE_STEP_INDEX = 3;

/** Step index for the review/preview step in edit client flow */
export const EDIT_CLIENT_REVIEW_STEP_INDEX = 4;
