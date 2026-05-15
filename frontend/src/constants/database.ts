import type { DbCategory, DbType, ConnectionForm } from "../types";

// Local icon base path — all icons are bundled in the repo under public/images/db-icons/
const I = "/images/db-icons";
const FALLBACK = `${I}/database.png`;

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
    icon: `${I}/postgresql.png`,
    category: ["Popular", "SQL"],
  },
  {
    value: "clickhouse",
    label: "ClickHouse",
    defaultPort: 443,
    icon: `${I}/clickhouse.png`,
    category: ["Popular", "Analytical"],
  },
  { value: "mysql", label: "MySQL", defaultPort: 3306, icon: `${I}/mysql.png`, category: ["Popular", "SQL"] },
  { value: "mariadb", label: "MariaDB", defaultPort: 3306, icon: `${I}/mariadb.png`, category: ["Popular", "SQL"] },
  { value: "oracle", label: "Oracle", defaultPort: 1521, icon: `${I}/oracle.png`, category: ["Popular", "SQL"] },
  { value: "mssql", label: "SQL Server", defaultPort: 1433, icon: `${I}/mssql.png`, category: ["Popular", "SQL"] },
  { value: "db2", label: "DB2", defaultPort: 50000, icon: `${I}/db2.png`, category: ["SQL"] },
  { value: "sybase", label: "Sybase", defaultPort: 5000, icon: `${I}/sybase.png`, category: ["SQL"] },
  { value: "informix", label: "Informix", defaultPort: 9089, icon: `${I}/informix.png`, category: ["SQL"] },
  { value: "firebird", label: "Firebird", defaultPort: 3050, icon: `${I}/firebird.png`, category: ["SQL"] },
  { value: "derby", label: "Derby", defaultPort: 1527, icon: `${I}/derby.png`, category: ["SQL", "Embedded"] },
  { value: "ingres", label: "Ingres", defaultPort: 21071, icon: `${I}/ingres.png`, category: ["SQL"] },
  { value: "altibase", label: "Altibase", defaultPort: 20300, icon: `${I}/altibase.png`, category: ["SQL"] },
  { value: "cubrid", label: "CUBRID", defaultPort: 33000, icon: `${I}/cubrid.png`, category: ["SQL"] },
  { value: "dameng", label: "Dameng", defaultPort: 5236, icon: `${I}/dameng.png`, category: ["SQL"] },
  { value: "kingbase", label: "Kingbase", defaultPort: 54321, icon: `${I}/kingbase.png`, category: ["SQL"] },
  { value: "gbase8s", label: "GBase 8s", defaultPort: 9088, icon: `${I}/gbase8s.png`, category: ["SQL"] },
  { value: "nuodb", label: "NuoDB", defaultPort: 48004, icon: `${I}/nuodb.png`, category: ["SQL"] },
  { value: "babelfish", label: "Babelfish", defaultPort: 1433, icon: `${I}/babelfish.png`, category: ["SQL"] },
  { value: "enterprisedb", label: "EnterpriseDB", defaultPort: 5444, icon: `${I}/edb.png`, category: ["SQL"] },
  { value: "iris", label: "InterSystems IRIS", defaultPort: 1972, icon: `${I}/iris.png`, category: ["SQL"] },
  { value: "virtuoso", label: "Virtuoso", defaultPort: 1111, icon: `${I}/virtuoso.png`, category: ["SQL"] },
  { value: "teiid", label: "Teiid", defaultPort: 31000, icon: `${I}/teiid.png`, category: ["SQL"] },
  { value: "maxdb", label: "MaxDB", defaultPort: 7210, icon: `${I}/maxdb.png`, category: ["SQL"] },

  // ── Cloud ──
  {
    value: "snowflake",
    label: "Snowflake",
    defaultPort: 443,
    icon: `${I}/snowflake.png`,
    category: ["Popular", "Cloud", "Analytical"],
  },
  {
    value: "redshift",
    label: "Amazon Redshift",
    defaultPort: 5439,
    icon: `${I}/postgresql.png`,
    category: ["Cloud", "Analytical"],
  },
  {
    value: "athena",
    label: "Amazon Athena",
    defaultPort: 443,
    icon: `${I}/athena.png`,
    category: ["Cloud", "Analytical"],
  },
  {
    value: "bigquery",
    label: "Google BigQuery",
    defaultPort: 443,
    icon: `${I}/bigquery.png`,
    category: ["Cloud", "Analytical"],
  },
  { value: "spanner", label: "Google Spanner", defaultPort: 443, icon: `${I}/spanner.png`, category: ["Cloud", "SQL"] },
  { value: "azuresql", label: "Azure SQL", defaultPort: 1433, icon: `${I}/azuresql.png`, category: ["Cloud", "SQL"] },
  {
    value: "databricks",
    label: "Databricks",
    defaultPort: 443,
    icon: `${I}/databricks.svg`,
    category: ["Cloud", "Analytical"],
  },
  { value: "salesforce", label: "Salesforce", defaultPort: 443, icon: FALLBACK, category: ["Cloud"] },
  { value: "datavirtuality", label: "Data Virtuality", defaultPort: 35432, icon: FALLBACK, category: ["Cloud"] },
  { value: "denodo", label: "Denodo", defaultPort: 9999, icon: `${I}/denodo.png`, category: ["Cloud"] },

  // ── Analytical ──
  { value: "vertica", label: "Vertica", defaultPort: 5433, icon: `${I}/vertica.png`, category: ["Analytical"] },
  { value: "teradata", label: "Teradata", defaultPort: 1025, icon: `${I}/teradata.png`, category: ["Analytical"] },
  { value: "exasol", label: "Exasol", defaultPort: 8563, icon: `${I}/exasol.png`, category: ["Analytical"] },
  { value: "netezza", label: "Netezza", defaultPort: 5480, icon: `${I}/netezza.png`, category: ["Analytical"] },
  { value: "greenplum", label: "Greenplum", defaultPort: 5432, icon: `${I}/greenplum.png`, category: ["Analytical"] },
  { value: "monetdb", label: "MonetDB", defaultPort: 50000, icon: `${I}/monetdb.png`, category: ["Analytical"] },
  { value: "druid", label: "Apache Druid", defaultPort: 8888, icon: `${I}/apache.png`, category: ["Analytical"] },
  { value: "kylin", label: "Apache Kylin", defaultPort: 7070, icon: `${I}/apache.png`, category: ["Analytical"] },
  { value: "starrocks", label: "StarRocks", defaultPort: 9030, icon: `${I}/starrocks.svg`, category: ["Analytical"] },
  {
    value: "materialize",
    label: "Materialize",
    defaultPort: 6875,
    icon: `${I}/materialize.png`,
    category: ["Analytical"],
  },
  { value: "dolphindb", label: "DolphinDB", defaultPort: 8848, icon: `${I}/dolphindb.png`, category: ["Analytical"] },
  {
    value: "databend",
    label: "Databend",
    defaultPort: 8000,
    icon: `${I}/databend.png`,
    category: ["Analytical", "Cloud"],
  },
  {
    value: "cloudberry",
    label: "Cloudberry",
    defaultPort: 5432,
    icon: `${I}/cloudberry.png`,
    category: ["Analytical"],
  },
  {
    value: "presto",
    label: "Presto",
    defaultPort: 8080,
    icon: `${I}/presto.png`,
    category: ["Analytical", "Hadoop / BigData"],
  },
  {
    value: "trino",
    label: "Trino",
    defaultPort: 8080,
    icon: `${I}/trino.png`,
    category: ["Analytical", "Hadoop / BigData"],
  },
  { value: "saphana", label: "SAP HANA", defaultPort: 30015, icon: `${I}/saphana.png`, category: ["Analytical"] },
  {
    value: "yellowbrick",
    label: "Yellowbrick",
    defaultPort: 5432,
    icon: `${I}/yellowbrick.png`,
    category: ["Analytical"],
  },
  { value: "ocient", label: "Ocient", defaultPort: 4050, icon: `${I}/ocient.png`, category: ["Analytical"] },
  { value: "gaussdb", label: "GaussDB", defaultPort: 25308, icon: `${I}/gaussdb.png`, category: ["Analytical"] },

  // ── NoSQL ──
  {
    value: "cockroachdb",
    label: "CockroachDB",
    defaultPort: 26257,
    icon: `${I}/cockroachdb.png`,
    category: ["NoSQL", "SQL"],
  },
  { value: "tidb", label: "TiDB", defaultPort: 4000, icon: `${I}/tidb.png`, category: ["NoSQL", "SQL"] },
  { value: "yugabyte", label: "YugabyteDB", defaultPort: 5433, icon: `${I}/yugabyte.png`, category: ["NoSQL", "SQL"] },
  { value: "oceanbase", label: "OceanBase", defaultPort: 2881, icon: `${I}/oceanbase.png`, category: ["NoSQL", "SQL"] },
  { value: "cratedb", label: "CrateDB", defaultPort: 4200, icon: `${I}/cratedb.png`, category: ["NoSQL"] },

  // ── Hadoop / BigData ──
  { value: "hive", label: "Apache Hive", defaultPort: 10000, icon: `${I}/hive.png`, category: ["Hadoop / BigData"] },
  {
    value: "impala",
    label: "Apache Impala",
    defaultPort: 21050,
    icon: `${I}/impala.png`,
    category: ["Hadoop / BigData"],
  },
  { value: "spark", label: "Apache Spark", defaultPort: 10000, icon: `${I}/spark.png`, category: ["Hadoop / BigData"] },
  { value: "drill", label: "Apache Drill", defaultPort: 8047, icon: `${I}/drill.png`, category: ["Hadoop / BigData"] },
  {
    value: "phoenix",
    label: "Apache Phoenix",
    defaultPort: 8765,
    icon: `${I}/phoenix.png`,
    category: ["Hadoop / BigData"],
  },
  {
    value: "ignite",
    label: "Apache Ignite",
    defaultPort: 10800,
    icon: `${I}/ignite.png`,
    category: ["Hadoop / BigData"],
  },
  { value: "mapd", label: "MapD / HeavyDB", defaultPort: 6274, icon: FALLBACK, category: ["Hadoop / BigData"] },
  { value: "omnisci", label: "OmniSci", defaultPort: 6274, icon: `${I}/omnisci.png`, category: ["Hadoop / BigData"] },

  // ── Timeseries ──
  {
    value: "timescaledb",
    label: "TimescaleDB",
    defaultPort: 5432,
    icon: `${I}/timescaledb.png`,
    category: ["Timeseries"],
  },
  { value: "tdengine", label: "TDEngine", defaultPort: 6041, icon: `${I}/tdengine.png`, category: ["Timeseries"] },
  { value: "machbase", label: "Machbase", defaultPort: 5656, icon: `${I}/machbase.png`, category: ["Timeseries"] },

  // ── Embedded ──
  { value: "sqlite", label: "SQLite", defaultPort: 0, icon: `${I}/sqlite.png`, category: ["Popular", "Embedded"] },
  { value: "h2", label: "H2", defaultPort: 9092, icon: `${I}/h2.png`, category: ["Embedded"] },
  { value: "h2gis", label: "H2GIS", defaultPort: 9092, icon: `${I}/h2gis.png`, category: ["Embedded"] },
  { value: "duckdb", label: "DuckDB", defaultPort: 0, icon: `${I}/duckdb.png`, category: ["Embedded", "Analytical"] },
  { value: "libsql", label: "LibSQL", defaultPort: 8080, icon: `${I}/libsql.png`, category: ["Embedded"] },

  // ── Files ──
  { value: "csv", label: "CSV", defaultPort: 0, icon: `${I}/csv.png`, category: ["Files"] },
  { value: "dbf", label: "DBF", defaultPort: 0, icon: `${I}/dbf.png`, category: ["Files"] },
  { value: "msaccess", label: "MS Access", defaultPort: 0, icon: `${I}/msaccess.png`, category: ["Files"] },

  // ── Search ──
  {
    value: "elasticsearch",
    label: "Elasticsearch",
    defaultPort: 9200,
    icon: `${I}/elasticsearch.png`,
    category: ["Search", "NoSQL"],
  },
  {
    value: "opensearch",
    label: "OpenSearch",
    defaultPort: 9200,
    icon: `${I}/opensearch.png`,
    category: ["Search", "NoSQL"],
  },

  // ── Graph ──
  { value: "orientdb", label: "OrientDB", defaultPort: 2424, icon: `${I}/orientdb.png`, category: ["Graph", "NoSQL"] },

  // ── Other ──
  { value: "wmi", label: "WMI", defaultPort: 0, icon: `${I}/wmi.png`, category: ["SQL"] },
  { value: "jdbcx", label: "JDBCX", defaultPort: 0, icon: FALLBACK, category: ["SQL"] },
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
