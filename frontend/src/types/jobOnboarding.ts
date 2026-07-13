/**
 * Types for the Job Onboarding feature.
 */

export interface SLAPolicy {
  day_of_week: string;
  schedule_frequency: string;
  expected_start_time: string;
  expected_sla_time: string;
  expected_time: string;
  timezone: string;
  days_addition_start_time: number;
  days_addition_sla: number;
  expected_duration_minutes: number | null;
  data_date_formula: number | null;
}

export interface ProxyRule {
  trigger_job_id: number;
  trigger_job_name: string;
  trigger_job_status: string;
  proxy_job_status: string;
  proxy_completion_percentage: number;
}

export interface ArtifactDef {
  artifact_pattern: string;
  type: string;
  expected_count: number;
  completion_trigger: string;
  triggers_job_status: string;
  source_type: string;
  job_name: string;
}

export interface TriggerJob {
  job_id: number;
  job_name: string;
}

export interface JobFormData {
  jobName: string;
  ownerEmail: string;
  oncallProjectName: string;
  oncallContact: string;
  l3OwnerEmail: string;
  l2OwnerEmail: string;
  supportTeamDl: string;
  jobDescription: string;
  isProxy: boolean;
  slaPolicies: SLAPolicy[];
  proxyRules: ProxyRule[];
  artifacts: ArtifactDef[];
}

/** Validation errors keyed by field name */
export type JobFormErrors = Partial<Record<keyof JobFormData, string>>;
