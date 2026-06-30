/**
 * Types for the Report Health Dashboard.
 * Matches the API contract from the sample payload provided.
 */

export interface RunStatus {
  data_date: string;
  status: string;
  delay_status: string;
  completion_percentage: number;
  start_time: string | null;
  end_time: string | null;
  client_name: string;
}

export interface ReportJob {
  job_id: number;
  job_name: string;
  sequence_id: number | null;
  job_category: string | null;
  is_final_step: boolean;

  // Status
  current_status: string;
  job_status: string;
  completion_percentage: number;
  job_completion_percentage: number;
  delay_status: string;
  delay_duration_minutes: number;
  job_running_status: string;
  job_state: string;

  // Timing
  start_time: string | null;
  job_start_timestamp: string | null;
  end_time: string | null;
  job_end_timestamp: string | null;
  expected_start_time: string | null;
  job_expected_sla: string | null;
  projected_end_time: string | null;
  last_updated_time: string | null;

  // Incident
  sev1_numbers: string | null;
  sev1_urls: string | null;
  sev1_number: string | null;
  sev1_url: string | null;
  gspace_url: string | null;

  // DAG relationships
  next_jobs_list: string;
  previous_jobs_list: string;

  // Ownership
  job_owner_name: string | null;
  oncall_name: string | null;
  L3_owner_name: string | null;
  L2_owner_name: string | null;
  support_team_DL: string | null;

  // Orchestration
  run_id: string | null;
  job_url: string | null;
  orchestrator_name: string | null;
  message_source: string | null;

  // Description & mode
  data_date: string;
  job_description: string | null;
  run_requirement_mode: string;
  required_runs: number;
  completed_required_runs: number;
  running_required_runs: number;
  delayed_required_runs: number;
  covered_data_dates: string[];
  run_statuses: RunStatus[];
}

export interface ReportLiveState {
  report_id: number;
  report_name: string;
  application_name: string;
  data_date: string;
  coverage_start_date: string | null;
  coverage_end_date: string | null;
  delivery_date: string;
  client_name: string;

  // Delivery state
  report_delivery_status: string;
  report_delay_status: string;
  report_delay_duration_minutes: number;

  // Step counts
  total_no_of_steps: number;
  no_of_completed_steps: number;
  no_of_running_steps: number;
  no_of_delayed_steps: number;

  // SLA
  bam_sla: string | null;
  report_start_time: string | null;
  report_end_time: string | null;

  // Incidents
  sev1_numbers: string | null;
  sev1_urls: string | null;

  // Delayed jobs (comma-separated list)
  delayed_job_name: string | null;

  report_metadata: Record<string, unknown> | null;
  workflow_coordinates: Record<string, unknown> | null;
}

export interface ReportHealthPayload {
  /** The report summary (report_live_state fields) */
  report: ReportLiveState;
  /** All jobs belonging to this report for the given window */
  jobs: ReportJob[];
  coverage_start_date: string;
  coverage_end_date: string;
  covered_data_dates: string[];
}

/** Derived summary stats computed on the frontend */
export interface ReportHealthStats {
  totalReports: number;
  delayedReports: number;
  onTrackReports: number;
  inProgressReports: number;
}
