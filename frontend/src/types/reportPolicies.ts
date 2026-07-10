/**
 * Type definitions for the Report Policies feature.
 */

export interface ReportDef {
  report_id: number;
  report_name: string;
  application_name: string;
  is_fastie: boolean;
  is_deleted: boolean;
}

export interface SlaPolicy {
  policy_id: string;
  report_id: number;
  report_name: string;
  application_name: string;
  day_of_week: string;
  schedule_frequency: string;
  expected_start_time: string | null;
  expected_sla_time: string | null;
  expected_time: string | null;
  timezone: string | null;
  days_addition_start_time: number | null;
  days_addition_sla: number | null;
  data_date_formula: number | null;
  window_mode: string | null;
  window_start_offset_days: number | null;
  window_end_offset_days: number | null;
  anchor_type: string | null;
}

export interface PreviewStatement {
  sql: string;
  params: Record<string, unknown>;
}
