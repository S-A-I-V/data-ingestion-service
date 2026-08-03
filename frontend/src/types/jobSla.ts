/**
 * Types for the Job SLA Analyzer dashboard.
 * Matches the API contract from backend/app/services/job_sla/schemas.py
 */

// ── Job Types ────────────────────────────────────────────────────────────────

export interface JobDefinition {
  job_id: number;
  job_name: string;
  owner_email: string | null;
  oncall_project_name: string | null;
  oncall_contact: string | null;
  job_owner_name: string | null;
  l3_owner_name: string | null;
  l2_owner_name: string | null;
  support_team_dl: string | null;
  oncall_name: string | null;
  oncall_flag: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  // Job type info (populated from jobs list endpoint)
  job_type?: JobTypeLabel;
  has_artifacts?: boolean;
  is_proxy?: boolean;
  is_trigger?: boolean;
}

export type JobTypeLabel = "standard" | "artifact" | "proxy" | "artifact_proxy";

export interface JobType {
  type: JobTypeLabel;
  has_artifacts: boolean;
  is_proxy: boolean;
  is_trigger: boolean;
  artifact_count: number;
  proxy_rule_count: number;
  trigger_rule_count: number;
}

export interface JobLiveState {
  job_id: number;
  job_name: string;
  data_date: string;
  client_name: string | null;
  current_status: string | null;
  completion_percentage: number | null;
  delay_status: string | null;
  delay_duration_minutes: number | null;
  start_time: string | null;
  end_time: string | null;
  updated_at: string | null;
  jeet_threshold: string | null;
  reet_threshold: string | null;
  expected_start_time: string | null;
  job_expected_sla: string | null;
  projected_end_time: string | null;
  expected_duration_minutes: number | null;
  observed_duration_seconds: number | null;
  run_id: string | null;
  job_url: string | null;
  orchestrator_name: string | null;
  message_source: string | null;
  reissue_version: string | null;
  sev1_numbers: string | null;
  sev1_urls: string | null;
  job_delay_reason: string | null;
}

export interface JobEvent {
  event_id: string;
  job_name: string;
  data_date: string;
  status: string | null;
  source: string | null;
  event_timestamp: string | null;
  job_start_timestamp: string | null;
  completion_percent: number | null;
  run_id: string | null;
  job_url: string | null;
  reissue_version: string | null;
  orchestrator_name: string | null;
  client_name: string | null;
  created_at: string | null;
}

// ── SLA Types ────────────────────────────────────────────────────────────────

export interface SlaPolicy {
  policy_id: string;
  entity_name: string;
  entity_type: string;
  application_name: string | null;
  day_of_week: string | null;
  expected_time: string | null;
  expected_start_time: string | null;
  expected_sla_time: string | null;
  timezone: string | null;
  days_addition_start_time: number | null;
  days_addition_sla: number | null;
  expected_duration_minutes: number | null;
  schedule_frequency: string | null;
  data_date_formula: number | null;
  created_at: string | null;
}

export interface ComplianceSummary {
  total_runs: number;
  on_time_count: number;
  late_count: number;
  delayed_count: number;
  failed_count: number;
  running_count: number;
  on_time_percentage: number | null;
  avg_delay_minutes: number | null;
  max_delay_minutes: number | null;
}

// ── Artifact Types ───────────────────────────────────────────────────────────

export interface ArtifactDefinition {
  definition_id: string;
  parent_job_name: string | null;
  parent_job_id: number | null;
  job_name: string | null;
  artifact_pattern: string | null;
  type: string | null;
  expected_count: number | null;
  completion_trigger: string | null;
  triggers_job_status: string | null;
  source_type: string | null;
}

export interface ArtifactLiveState {
  artifact_id: string;
  parent_job_name: string | null;
  parent_job_id: number | null;
  data_date: string;
  actual_filename: string | null;
  status: string | null;
  timestamp: string | null;
  source_type: string | null;
  identifier: string | null;
  release_status: string | null;
  release_type: string | null;
  received_time: string | null;
  release_time: string | null;
  completion_percent: number | null;
  scheduled_release_time: string | null;
  observed_duration_seconds: number | null;
  created_at: string | null;
}

export interface ArtifactEvent {
  event_id: string;
  source_type: string | null;
  parent_job_name: string | null;
  data_date: string;
  identifier: string | null;
  file_name: string | null;
  status: string | null;
  completion_percent: number | null;
  event_timestamp: string | null;
  received_time: string | null;
  release_time: string | null;
  scheduled_release_time: string | null;
  release_type: string | null;
  report_name: string | null;
  delivery_date: string | null;
  client_name: string | null;
  created_at: string | null;
}

// ── Proxy Types ──────────────────────────────────────────────────────────────

export interface ProxyRule {
  id: string;
  proxy_job_id: number;
  proxy_job_name: string;
  proxy_job_status: string;
  proxy_completion_percentage: number | null;
  trigger_job_id: number;
  trigger_job_name: string;
  trigger_job_status: string;
  is_enabled: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ── Incident Types ───────────────────────────────────────────────────────────

export interface Sev1Incident {
  incident_id: string;
  job_name: string;
  data_date: string;
  sev1_number: string | null;
  sev1_url: string | null;
  gspace_url: string | null;
  projected_end_time: string | null;
  created_by: string | null;
  created_at: string | null;
}

export interface IncidentOverride {
  override_id: string;
  job_name: string;
  data_date: string;
  proposed_end_time: string | null;
  ticket_url: string | null;
  created_by: string | null;
  created_at: string | null;
}

// ── Heatmap/Trend Types ──────────────────────────────────────────────────────

export interface HeatmapCell {
  day_of_week: number; // 0=Sunday, 6=Saturday
  hour_of_day: number; // 0-23
  run_count: number;
  delayed_count: number;
  on_time_count: number;
  late_count: number;
  failed_count: number;
  avg_duration_minutes: number | null;
}

export interface TrendPoint {
  period_start: string;
  total_runs: number;
  delayed_count: number;
  on_time_count: number;
  late_count: number;
  failed_count: number;
  on_time_percentage: number | null;
  avg_delay_minutes: number | null;
  avg_duration_minutes: number | null;
  p95_duration_minutes: number | null;
  expected_duration_minutes: number | null;
}

export interface DurationBucket {
  bucket_start: number;
  count: number;
}

export interface TrendInsightsPeriod {
  date_from: string;
  date_to: string;
  total_runs: number;
  on_time_count: number;
  late_count: number;
  failed_count: number;
  avg_duration_minutes: number | null;
  p95_duration_minutes: number | null;
  on_time_percentage: number | null;
}

export interface TrendInsights {
  current_period: TrendInsightsPeriod;
  previous_period: TrendInsightsPeriod;
  worst_day_of_week: number | null;
  worst_day_late_percentage: number | null;
  duration_trend_percentage: number | null;
  duration_trend_direction: "faster" | "slower" | null;
  on_time_trend_change: number | null;
  on_time_trend_direction: "improving" | "declining" | null;
}

export interface DayOfWeekStats {
  day_of_week: number;
  total_runs: number;
  late_count: number;
  failed_count: number;
  late_percentage: number | null;
  avg_duration_minutes: number | null;
}

export interface SlaTimelinePoint {
  data_date: string;
  expected_sla_minutes: number | null; // Minutes from midnight
  actual_end_minutes: number | null; // Minutes from midnight
  deviation_minutes: number | null; // Positive = late, negative = early
  current_status: string | null;
  delay_status: string | null;
  delay_duration_minutes: number | null;
}

// ── API Response Types ───────────────────────────────────────────────────────

export interface JobListResponse {
  jobs: JobDefinition[];
}

export interface JobSummaryResponse {
  job: JobDefinition;
  job_type: JobType;
  compliance: ComplianceSummary;
  sla_policies: SlaPolicy[];
}

export interface LiveStateHistoryResponse {
  history: JobLiveState[];
}

export interface EventHistoryResponse {
  events: JobEvent[];
}

export interface HeatmapResponse {
  cells: HeatmapCell[];
}

export interface TrendResponse {
  weekly: TrendPoint[];
  monthly: TrendPoint[];
  sla_timeline: SlaTimelinePoint[] | null;
  insights: TrendInsights | null;
  day_of_week_stats: DayOfWeekStats[] | null;
  day_of_week_sla_bars: DayOfWeekSlaBars[] | null;
  weekly_sla_bars: WeeklySlaBars[] | null;
}

/** Per-day-of-week SLA expected vs actual bar data */
export interface DayOfWeekSlaBars {
  day_of_week: number;
  total_runs: number;
  occurrence_count: number | null;
  most_recent_date: string | null;
  breach_count: number;
  on_time_count: number;
  failed_count: number;
  expected_start_minutes: number | null; // avg expected start time (mins from midnight)
  actual_start_minutes: number | null; // avg actual start time (mins from midnight)
  expected_sla_minutes: number | null; // avg expected SLA end time (mins from midnight)
  actual_end_minutes: number | null; // avg actual end time (mins from midnight)
  avg_delay_minutes: number | null;
  on_time_percentage: number | null;
}

/** Per-week SLA expected vs actual bar data */
export interface WeeklySlaBars {
  week_start: string; // ISO date string
  total_runs: number;
  breach_count: number;
  on_time_count: number;
  failed_count: number;
  expected_start_minutes: number | null;
  actual_start_minutes: number | null;
  expected_sla_minutes: number | null;
  actual_end_minutes: number | null;
  avg_delay_minutes: number | null;
  on_time_percentage: number | null;
}

export interface DurationDistributionResponse {
  buckets: DurationBucket[];
}

export interface ArtifactResponse {
  definitions: ArtifactDefinition[];
  live_state: ArtifactLiveState[];
  events: ArtifactEvent[];
}

export interface ProxyResponse {
  proxy_rules: ProxyRule[];
  trigger_rules: ProxyRule[];
}

export interface IncidentResponse {
  sev1_incidents: Sev1Incident[];
  overrides: IncidentOverride[];
}

// ── UI State Types ───────────────────────────────────────────────────────────

export type JobSlaTab = "overview" | "heatmap" | "history" | "artifacts" | "proxy";
