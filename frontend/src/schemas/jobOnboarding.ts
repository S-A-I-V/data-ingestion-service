/**
 * Zod validation schemas for Job Onboarding wizard.
 *
 * Schemas are split per step so react-hook-form can validate incrementally.
 * The full schema is a single flat object — no .superRefine on the root to keep it mergeable.
 */

import { z } from "zod";
import { JOB_NAME_MIN_LENGTH } from "../constants/jobOnboarding";

/* ─── Shared field schemas ─────────────────────────────────────────────────── */

const nielsenEmail = z
  .string()
  .trim()
  .min(1, "Required")
  .email("Must be a valid email address")
  .max(254, "Email exceeds maximum length");

/* ─── Step 0: Job Definition ───────────────────────────────────────────────── */

export const jobDefinitionSchema = z.object({
  jobName: z
    .string()
    .trim()
    .min(1, "Job name is required")
    .min(JOB_NAME_MIN_LENGTH, `Job name must be at least ${JOB_NAME_MIN_LENGTH} characters`)
    .max(255, "Job name cannot exceed 255 characters")
    .regex(
      /^[a-zA-Z0-9_\-. +]+$/,
      "Job name can only contain letters, numbers, underscores, hyphens, dots, spaces, and plus signs",
    ),
  jobDescription: z.string().max(2000, "Description cannot exceed 2000 characters").default(""),
  ownerEmail: nielsenEmail,
  l2OwnerEmail: nielsenEmail,
  l3OwnerEmail: nielsenEmail,
  oncallContact: nielsenEmail,
  supportTeamDl: nielsenEmail,
  oncallProjectName: z.string().max(255, "Project name cannot exceed 255 characters").default(""),
});

export type JobDefinitionValues = z.infer<typeof jobDefinitionSchema>;

/* ─── Step 1: SLA & Proxy ──────────────────────────────────────────────────── */

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const slaPolicySchema = z.object({
  day_of_week: z.string().min(1, "Day of week is required"),
  schedule_frequency: z.string().min(1, "Frequency is required"),
  expected_start_time: z
    .string()
    .min(1, "Start time is required")
    .regex(TIME_REGEX, "Must be HH:MM or HH:MM:SS format"),
  expected_sla_time: z.string().min(1, "SLA time is required").regex(TIME_REGEX, "Must be HH:MM or HH:MM:SS format"),
  expected_time: z.string().default(""),
  timezone: z.string().min(1, "Timezone is required"),
  days_addition_start_time: z.number().int().min(0).max(7, "Cannot exceed 7 days").default(0),
  days_addition_sla: z.number().int().min(0).max(7, "Cannot exceed 7 days").default(0),
  expected_duration_minutes: z.number().int().min(0).max(1440, "Cannot exceed 24 hours").nullable().default(null),
  data_date_formula: z.number().int().nullable().default(null),
});

export const proxyRuleSchema = z.object({
  trigger_job_id: z.number().int().positive("Trigger job is required"),
  trigger_job_name: z.string().min(1, "Trigger job name is required"),
  trigger_job_status: z.string().min(1, "Trigger status is required"),
  proxy_job_status: z.string().min(1, "Proxy status is required"),
  proxy_completion_percentage: z.number().int().min(0).max(100, "Must be 0-100").default(100),
});

export const slaProxySchema = z.object({
  isProxy: z.boolean(),
  slaPolicies: z.array(slaPolicySchema),
  proxyRules: z.array(proxyRuleSchema),
});

export type SlaProxyValues = z.infer<typeof slaProxySchema>;

/* ─── Step 2: Artifacts ────────────────────────────────────────────────────── */

export const artifactDefSchema = z.object({
  artifact_pattern: z
    .string()
    .trim()
    .min(1, "Artifact pattern is required")
    .max(255, "Pattern cannot exceed 255 characters"),
  type: z.enum(["C2C", "NDD"], { errorMap: () => ({ message: "Type must be C2C or NDD" }) }),
  expected_count: z.number().int().min(1, "Expected count must be at least 1").default(1),
  completion_trigger: z.string().default("ALL_PRESENT"),
  triggers_job_status: z.string().default(""),
  source_type: z.string().default("C2C"),
  job_name: z.string().max(255, "Job name cannot exceed 255 characters").default(""),
});

export const artifactsSchema = z.object({
  artifacts: z.array(artifactDefSchema),
});

export type ArtifactsValues = z.infer<typeof artifactsSchema>;

/* ─── Full schema (flat merge of all steps) ────────────────────────────────── */

export const jobOnboardingSchema = jobDefinitionSchema.merge(slaProxySchema).merge(artifactsSchema);

export type JobOnboardingValues = z.infer<typeof jobOnboardingSchema>;

/**
 * Custom validation for step 1 (cross-field logic that Zod superRefine
 * would handle, but we do outside the schema to keep it mergeable).
 */
export function validateSlaProxyStep(data: SlaProxyValues): string | null {
  if (!data.isProxy && data.slaPolicies.length === 0) {
    return "At least one SLA policy is required for standard jobs";
  }
  if (data.isProxy && data.proxyRules.length === 0) {
    return "At least one proxy rule is required for proxy jobs";
  }
  return null;
}
