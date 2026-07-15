/**
 * Constants for Job Onboarding wizard.
 */

import type { Step } from "../components/onboarding/StepProgress";

/** Wizard step definitions for the progress indicator */
export const JOB_ONBOARDING_STEPS: Step[] = [
  { label: "Job Definition", description: "Identity & ownership" },
  { label: "SLA & Proxy", description: "Policies or trigger config" },
  { label: "Artifacts", description: "Expected output files" },
  { label: "Preview", description: "Review & execute" },
];

/** Total number of wizard steps */
export const JOB_ONBOARDING_STEP_COUNT = JOB_ONBOARDING_STEPS.length;

/** Index of the final preview step */
export const JOB_PREVIEW_STEP_INDEX = 3;

/** Days of week for SLA policy day selection */
export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** Default timezone for SLA policies */
export const DEFAULT_SLA_TIMEZONE = "EST";

/** Default schedule frequency */
export const DEFAULT_SCHEDULE_FREQUENCY = "daily";

/** Artifact type options (from prod: C2C or NDD) */
export const ARTIFACT_TYPES = ["C2C", "NDD"] as const;

/** Completion trigger options (only ALL_PRESENT exists in prod) */
export const COMPLETION_TRIGGERS = ["ALL_PRESENT"] as const;

/** Common job status values */
export const JOB_STATUSES = ["COMPLETED", "RUNNING", "FAILED", "NOT_STARTED"] as const;

/** Trigger job status options for proxy inference rules (from job_proxy_inference_rules) */
export const PROXY_TRIGGER_STATUSES = ["success", "in_progress"] as const;

/** Proxy job status options for proxy inference rules (from job_proxy_inference_rules) */
export const PROXY_JOB_STATUSES = ["success"] as const;

/* ─── Validation ───────────────────────────────────────────────────────────── */

/** Minimum length for job name */
export const JOB_NAME_MIN_LENGTH = 3;

/** Regex for validating email addresses */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validation error messages */
export const VALIDATION_MESSAGES = {
  JOB_NAME_REQUIRED: "Job name is required",
  JOB_NAME_TOO_SHORT: `Job name must be at least ${JOB_NAME_MIN_LENGTH} characters`,
  OWNER_EMAIL_REQUIRED: "Owner email is required",
  OWNER_EMAIL_INVALID: "Must be a valid email address",
  ONCALL_CONTACT_REQUIRED: "On-call contact email is required",
  ONCALL_CONTACT_INVALID: "Must be a valid email address",
  SUPPORT_DL_INVALID: "Must be a valid email address",
  L2_OWNER_INVALID: "Must be a valid email address",
  L3_OWNER_INVALID: "Must be a valid email address",
} as const;
