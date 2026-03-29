import type { DbType, ConnectionForm } from "../types";

export const DB_TYPES: DbType[] = [
  { value: "postgres", label: "PostgreSQL", defaultPort: 5432, icon: "https://www.svgrepo.com/show/354200/postgresql.svg" },
  { value: "clickhouse", label: "ClickHouse", defaultPort: 443, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/clickhouse/clickhouse-original.svg" },
  { value: "mysql", label: "MySQL", defaultPort: 3306, icon: "https://www.svgrepo.com/show/303251/mysql-logo.svg" },
  { value: "mssql", label: "SQL Server", defaultPort: 1433, icon: "https://www.svgrepo.com/show/303229/microsoft-sql-server-logo.svg" },
  { value: "sybase", label: "Sybase", defaultPort: 5000, icon: "https://www.svgrepo.com/show/331760/sql-database-generic.svg" },
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
