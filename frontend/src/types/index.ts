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
