import type { DbCategory, DbType, ConnectionForm } from "../types";

// Icon URLs — use external CDN (works in both Vite and MAF, no local files needed)
// simpleicons.org provides SVGs by brand slug: https://cdn.simpleicons.org/{slug}
// devicons (jsdelivr): https://cdn.jsdelivr.net/gh/devicons/devicon/icons/{name}/{name}-original.svg
const SI = "https://cdn.simpleicons.org";
const DI = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

/** Databases without an available brand logo use "GENERIC" to render the inline SVG fallback. */
const GENERIC = "GENERIC";

export const DB_CATEGORIES: { id: DbCategory | "All"; label: string }[] = [
  { id: "All", label: "All" },
  { id: "Popular", label: "Popular" },
  { id: "SQL", label: "SQL" },
  { id: "NoSQL", label: "NoSQL" },
  { id: "Analytical", label: "Analytical" },
  { id: "Cloud", label: "Cloud" },
  { id: "Timeseries", label: "Timeseries" },
  { id: "Hadoop / BigData", label: "Hadoop / BigData" },
  { id: "Embedded", label: "Embedded" },
  { id: "Files", label: "Files" },
  { id: "Search", label: "Full-text Search" },
  { id: "Graph", label: "Graph Databases" },
];

export const DB_TYPES: DbType[] = [
  // ── Popular / SQL ──
  {
    value: "postgres",
    label: "PostgreSQL",
    defaultPort: 5432,
    icon: `${DI}/postgresql/postgresql-original.svg`,
    category: ["Popular", "SQL"],
  },
  {
    value: "clickhouse",
    label: "ClickHouse",
    defaultPort: 443,
    icon: `${SI}/clickhouse`,
    category: ["Popular", "Analytical"],
  },
  {
    value: "mysql",
    label: "MySQL",
    defaultPort: 3306,
    icon: `${DI}/mysql/mysql-original.svg`,
    category: ["Popular", "SQL"],
  },
  {
    value: "mariadb",
    label: "MariaDB",
    defaultPort: 3306,
    icon: `${SI}/mariadb`,
    category: ["Popular", "SQL"],
  },
  {
    value: "oracle",
    label: "Oracle",
    defaultPort: 1521,
    icon: `${DI}/oracle/oracle-original.svg`,
    category: ["Popular", "SQL"],
  },
  {
    value: "mssql",
    label: "SQL Server",
    defaultPort: 1433,
    icon: `${DI}/microsoftsqlserver/microsoftsqlserver-plain.svg`,
    category: ["Popular", "SQL"],
  },
  { value: "db2", label: "DB2", defaultPort: 50000, icon: GENERIC, category: ["SQL"] },
  { value: "sybase", label: "Sybase", defaultPort: 5000, icon: `${SI}/sap`, category: ["SQL"] },
  { value: "informix", label: "Informix", defaultPort: 9089, icon: GENERIC, category: ["SQL"] },
  { value: "firebird", label: "Firebird", defaultPort: 3050, icon: GENERIC, category: ["SQL"] },
  { value: "derby", label: "Derby", defaultPort: 1527, icon: `${SI}/apache`, category: ["SQL", "Embedded"] },
  { value: "ingres", label: "Ingres", defaultPort: 21071, icon: GENERIC, category: ["SQL"] },
  { value: "altibase", label: "Altibase", defaultPort: 20300, icon: GENERIC, category: ["SQL"] },
  { value: "cubrid", label: "CUBRID", defaultPort: 33000, icon: GENERIC, category: ["SQL"] },
  { value: "dameng", label: "Dameng", defaultPort: 5236, icon: GENERIC, category: ["SQL"] },
  { value: "kingbase", label: "Kingbase", defaultPort: 54321, icon: GENERIC, category: ["SQL"] },
  { value: "gbase8s", label: "GBase 8s", defaultPort: 9088, icon: GENERIC, category: ["SQL"] },
  { value: "nuodb", label: "NuoDB", defaultPort: 48004, icon: GENERIC, category: ["SQL"] },
  {
    value: "babelfish",
    label: "Babelfish",
    defaultPort: 1433,
    icon: `${DI}/amazonwebservices/amazonwebservices-original-wordmark.svg`,
    category: ["SQL"],
  },
  {
    value: "enterprisedb",
    label: "EnterpriseDB",
    defaultPort: 5444,
    icon: `${DI}/postgresql/postgresql-original.svg`,
    category: ["SQL"],
  },
  { value: "iris", label: "InterSystems IRIS", defaultPort: 1972, icon: GENERIC, category: ["SQL"] },
  { value: "virtuoso", label: "Virtuoso", defaultPort: 1111, icon: GENERIC, category: ["SQL"] },
  { value: "teiid", label: "Teiid", defaultPort: 31000, icon: `${SI}/redhat`, category: ["SQL"] },
  { value: "maxdb", label: "MaxDB", defaultPort: 7210, icon: `${SI}/sap`, category: ["SQL"] },

  // ── Cloud ──
  {
    value: "snowflake",
    label: "Snowflake",
    defaultPort: 443,
    icon: `${SI}/snowflake/29B5E8`,
    category: ["Popular", "Cloud", "Analytical"],
  },
  {
    value: "redshift",
    label: "Amazon Redshift",
    defaultPort: 5439,
    icon: `${DI}/amazonwebservices/amazonwebservices-original-wordmark.svg`,
    category: ["Cloud", "Analytical"],
  },
  {
    value: "athena",
    label: "Amazon Athena",
    defaultPort: 443,
    icon: `${DI}/amazonwebservices/amazonwebservices-original-wordmark.svg`,
    category: ["Cloud", "Analytical"],
  },
  {
    value: "bigquery",
    label: "Google BigQuery",
    defaultPort: 443,
    icon: `${SI}/googlebigquery/669DF6`,
    category: ["Cloud", "Analytical"],
  },
  {
    value: "spanner",
    label: "Google Spanner",
    defaultPort: 443,
    icon: `${SI}/googlecloud/4285F4`,
    category: ["Cloud", "SQL"],
  },
  {
    value: "azuresql",
    label: "Azure SQL",
    defaultPort: 1433,
    icon: `${DI}/azure/azure-original.svg`,
    category: ["Cloud", "SQL"],
  },
  {
    value: "databricks",
    label: "Databricks",
    defaultPort: 443,
    icon: `${SI}/databricks/FF3621`,
    category: ["Cloud", "Analytical"],
  },
  {
    value: "salesforce",
    label: "Salesforce",
    defaultPort: 443,
    icon: `${DI}/salesforce/salesforce-original.svg`,
    category: ["Cloud"],
  },
  { value: "datavirtuality", label: "Data Virtuality", defaultPort: 35432, icon: GENERIC, category: ["Cloud"] },
  { value: "denodo", label: "Denodo", defaultPort: 9999, icon: GENERIC, category: ["Cloud"] },

  // ── Analytical ──
  { value: "vertica", label: "Vertica", defaultPort: 5433, icon: GENERIC, category: ["Analytical"] },
  { value: "teradata", label: "Teradata", defaultPort: 1025, icon: `${SI}/teradata/F37440`, category: ["Analytical"] },
  { value: "exasol", label: "Exasol", defaultPort: 8563, icon: GENERIC, category: ["Analytical"] },
  { value: "netezza", label: "Netezza", defaultPort: 5480, icon: GENERIC, category: ["Analytical"] },
  { value: "greenplum", label: "Greenplum", defaultPort: 5432, icon: GENERIC, category: ["Analytical"] },
  { value: "monetdb", label: "MonetDB", defaultPort: 50000, icon: GENERIC, category: ["Analytical"] },
  {
    value: "druid",
    label: "Apache Druid",
    defaultPort: 8888,
    icon: `${SI}/apachedruid/29F1FB`,
    category: ["Analytical"],
  },
  { value: "kylin", label: "Apache Kylin", defaultPort: 7070, icon: `${SI}/apache`, category: ["Analytical"] },
  { value: "starrocks", label: "StarRocks", defaultPort: 9030, icon: GENERIC, category: ["Analytical"] },
  {
    value: "materialize",
    label: "Materialize",
    defaultPort: 6875,
    icon: GENERIC,
    category: ["Analytical"],
  },
  { value: "dolphindb", label: "DolphinDB", defaultPort: 8848, icon: GENERIC, category: ["Analytical"] },
  {
    value: "databend",
    label: "Databend",
    defaultPort: 8000,
    icon: GENERIC,
    category: ["Analytical", "Cloud"],
  },
  {
    value: "cloudberry",
    label: "Cloudberry",
    defaultPort: 5432,
    icon: GENERIC,
    category: ["Analytical"],
  },
  {
    value: "presto",
    label: "Presto",
    defaultPort: 8080,
    icon: `${SI}/presto/5890FF`,
    category: ["Analytical", "Hadoop / BigData"],
  },
  {
    value: "trino",
    label: "Trino",
    defaultPort: 8080,
    icon: `${SI}/trino/DD00A1`,
    category: ["Analytical", "Hadoop / BigData"],
  },
  { value: "saphana", label: "SAP HANA", defaultPort: 30015, icon: `${SI}/sap/0FAAFF`, category: ["Analytical"] },
  {
    value: "yellowbrick",
    label: "Yellowbrick",
    defaultPort: 5432,
    icon: GENERIC,
    category: ["Analytical"],
  },
  { value: "ocient", label: "Ocient", defaultPort: 4050, icon: GENERIC, category: ["Analytical"] },
  { value: "gaussdb", label: "GaussDB", defaultPort: 25308, icon: GENERIC, category: ["Analytical"] },

  // ── NoSQL ──
  {
    value: "cockroachdb",
    label: "CockroachDB",
    defaultPort: 26257,
    icon: `${SI}/cockroachlabs/6933FF`,
    category: ["NoSQL", "SQL"],
  },
  { value: "tidb", label: "TiDB", defaultPort: 4000, icon: GENERIC, category: ["NoSQL", "SQL"] },
  { value: "yugabyte", label: "YugabyteDB", defaultPort: 5433, icon: GENERIC, category: ["NoSQL", "SQL"] },
  { value: "oceanbase", label: "OceanBase", defaultPort: 2881, icon: GENERIC, category: ["NoSQL", "SQL"] },
  { value: "cratedb", label: "CrateDB", defaultPort: 4200, icon: GENERIC, category: ["NoSQL"] },

  // ── Hadoop / BigData ──
  {
    value: "hive",
    label: "Apache Hive",
    defaultPort: 10000,
    icon: `${SI}/apachehive/FDEE21`,
    category: ["Hadoop / BigData"],
  },
  {
    value: "impala",
    label: "Apache Impala",
    defaultPort: 21050,
    icon: `${SI}/apache`,
    category: ["Hadoop / BigData"],
  },
  {
    value: "spark",
    label: "Apache Spark",
    defaultPort: 10000,
    icon: `${SI}/apachespark/E25A1C`,
    category: ["Hadoop / BigData"],
  },
  { value: "drill", label: "Apache Drill", defaultPort: 8047, icon: `${SI}/apache`, category: ["Hadoop / BigData"] },
  {
    value: "phoenix",
    label: "Apache Phoenix",
    defaultPort: 8765,
    icon: `${SI}/apache`,
    category: ["Hadoop / BigData"],
  },
  {
    value: "ignite",
    label: "Apache Ignite",
    defaultPort: 10800,
    icon: `${SI}/apache`,
    category: ["Hadoop / BigData"],
  },
  { value: "mapd", label: "MapD / HeavyDB", defaultPort: 6274, icon: GENERIC, category: ["Hadoop / BigData"] },
  { value: "omnisci", label: "OmniSci", defaultPort: 6274, icon: GENERIC, category: ["Hadoop / BigData"] },

  // ── Timeseries ──
  {
    value: "timescaledb",
    label: "TimescaleDB",
    defaultPort: 5432,
    icon: `${SI}/timescale/FDB515`,
    category: ["Timeseries"],
  },
  { value: "tdengine", label: "TDEngine", defaultPort: 6041, icon: GENERIC, category: ["Timeseries"] },
  { value: "machbase", label: "Machbase", defaultPort: 5656, icon: GENERIC, category: ["Timeseries"] },

  // ── Embedded ──
  {
    value: "sqlite",
    label: "SQLite",
    defaultPort: 0,
    icon: `${SI}/sqlite/003B57`,
    category: ["Popular", "Embedded"],
  },
  { value: "h2", label: "H2", defaultPort: 9092, icon: GENERIC, category: ["Embedded"] },
  { value: "h2gis", label: "H2GIS", defaultPort: 9092, icon: GENERIC, category: ["Embedded"] },
  {
    value: "duckdb",
    label: "DuckDB",
    defaultPort: 0,
    icon: `${SI}/duckdb/FFF000`,
    category: ["Embedded", "Analytical"],
  },
  { value: "libsql", label: "LibSQL", defaultPort: 8080, icon: GENERIC, category: ["Embedded"] },

  // ── Files ──
  { value: "csv", label: "CSV", defaultPort: 0, icon: GENERIC, category: ["Files"] },
  { value: "dbf", label: "DBF", defaultPort: 0, icon: GENERIC, category: ["Files"] },
  { value: "msaccess", label: "MS Access", defaultPort: 0, icon: GENERIC, category: ["Files"] },

  // ── Search ──
  {
    value: "elasticsearch",
    label: "Elasticsearch",
    defaultPort: 9200,
    icon: `${SI}/elasticsearch/005571`,
    category: ["Search", "NoSQL"],
  },
  {
    value: "opensearch",
    label: "OpenSearch",
    defaultPort: 9200,
    icon: `${SI}/opensearch/005EB8`,
    category: ["Search", "NoSQL"],
  },

  // ── Graph ──
  { value: "orientdb", label: "OrientDB", defaultPort: 2424, icon: GENERIC, category: ["Graph", "NoSQL"] },

  // ── Other ──
  { value: "wmi", label: "WMI", defaultPort: 0, icon: GENERIC, category: ["SQL"] },
  { value: "jdbcx", label: "JDBCX", defaultPort: 0, icon: GENERIC, category: ["SQL"] },
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
  { id: "main", label: "General", icon: "settings_ethernet" },
  { id: "ssh", label: "SSH Tunnel", icon: "vpn_key" },
  { id: "ssl", label: "SSL / TLS", icon: "lock" },
  { id: "advanced", label: "Advanced", icon: "tune" },
];
