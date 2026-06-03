export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export interface Connection {
  id: number;
  name: string;
  db_type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  use_ssl: boolean;
  ssh_enabled: boolean;
  connection_timeout: number;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
}

export interface ColInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface AuditLog {
  id: number;
  user_email: string;
  connection_name: string;
  operation: string;
  table_name: string;
  row_count: number;
  query_preview: string;
  status: string;
  error_message: string | null;
  executed_at: string;
}

export interface Problem {
  tag: string;
  question: string;
  description: string;
  severity: number;
  tam: number;
  frequency: number;
  whitespace: number;
  itch: number;
  highlight: boolean;
}

export type DbCategory =
  | "Popular"
  | "SQL"
  | "NoSQL"
  | "Analytical"
  | "Cloud"
  | "Timeseries"
  | "Hadoop / BigData"
  | "Embedded"
  | "Files"
  | "Search"
  | "Graph";

export interface DbType {
  value: string;
  label: string;
  defaultPort: number;
  icon: string;
  category: DbCategory[];
}

export interface ConnectionForm {
  name: string;
  db_type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  use_ssl: boolean;
  ssh_enabled: boolean;
  ssh_host: string;
  ssh_port: number;
  ssh_username: string;
  ssh_password: string;
  connection_timeout: number;
  jdbc_url: string;
}

export interface AuditMetrics {
  total_operations: number;
  successful: number;
  failed: number;
  success_rate: number;
  total_rows_inserted: number;
  total_rows_skipped: number;
  total_data_ingested_bytes: number;
  total_time_ms: number;
  avg_throughput_rps: number;
  peak_throughput_rps: number;
  avg_duration_ms: number;
  avg_validation_score: number;
  total_error_rows: number;
  total_duplicates: number;
  peak_memory_bytes: number;
  total_cpu_time_s: number;
}
