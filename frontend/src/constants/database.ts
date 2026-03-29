import type { DbType, ConnectionForm } from "../types";

export const DB_TYPES: DbType[] = [
  { value: "postgres", label: "PostgreSQL", defaultPort: 5432, icon: "🐘" },
  { value: "clickhouse", label: "ClickHouse", defaultPort: 443, icon: "🏠" },
  { value: "mysql", label: "MySQL", defaultPort: 3306, icon: "🐬" },
  { value: "mssql", label: "SQL Server", defaultPort: 1433, icon: "🔷" },
  { value: "sybase", label: "Sybase", defaultPort: 5000, icon: "📊" },
];

export const EMPTY_CONNECTION_FORM: ConnectionForm = {
  name: "",
  db_type: "postgres",
  host: "",
  port: 5432,
  database: "",
  username: "",
  password: "",
  use_ssl: false,
  ssh_enabled: false,
  ssh_host: "",
  ssh_port: 22,
  ssh_username: "",
  ssh_password: "",
  connection_timeout: 30,
  jdbc_url: "",
};

export const MODAL_TABS = [
  { id: "main", label: "General", icon: "🔌" },
  { id: "ssh", label: "SSH Tunnel", icon: "🔑" },
  { id: "ssl", label: "SSL / TLS", icon: "🔒" },
  { id: "advanced", label: "Advanced", icon: "⚙️" },
];
