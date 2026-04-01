import type { DbCategory, DbType, ConnectionForm } from "../types";

// DBeaver icon base URL (raw GitHub)
const DB = "https://raw.githubusercontent.com/dbeaver/dbeaver/devel/plugins";
const EXT = `${DB}/org.jkiss.dbeaver.ext`;
const GEN = `${EXT}.generic/icons`;
const FALLBACK = `${DB}/org.jkiss.dbeaver.model/icons/connection/database_icon_big.png`;

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
  { value: "postgres", label: "PostgreSQL", defaultPort: 5432, icon: `${EXT}.postgresql/icons/postgresql_icon_big.png`, category: ["Popular", "SQL"] },
  { value: "clickhouse", label: "ClickHouse", defaultPort: 443, icon: `${EXT}.clickhouse/icons/clickhouse_icon_big.png`, category: ["Popular", "Analytical"] },
  { value: "mysql", label: "MySQL", defaultPort: 3306, icon: `${EXT}.mysql/icons/mysql_icon_big.png`, category: ["Popular", "SQL"] },
  { value: "mariadb", label: "MariaDB", defaultPort: 3306, icon: `${EXT}.mysql/icons/mariadb_icon_big.png`, category: ["Popular", "SQL"] },
  { value: "oracle", label: "Oracle", defaultPort: 1521, icon: `${EXT}.oracle/icons/oracle_icon_big.png`, category: ["Popular", "SQL"] },
  { value: "mssql", label: "SQL Server", defaultPort: 1433, icon: `${EXT}.mssql/icons/mssql_icon_big.png`, category: ["Popular", "SQL"] },
  { value: "db2", label: "DB2", defaultPort: 50000, icon: `${EXT}.db2/icons/db2_icon_big.png`, category: ["SQL"] },
  { value: "sybase", label: "Sybase", defaultPort: 5000, icon: `${EXT}.mssql/icons/sybase_icon_big.png`, category: ["SQL"] },
  { value: "informix", label: "Informix", defaultPort: 9089, icon: `${GEN}/informix_icon_big.png`, category: ["SQL"] },
  { value: "firebird", label: "Firebird", defaultPort: 3050, icon: `${EXT}.firebird/icons/firebird_icon_big.png`, category: ["SQL"] },
  { value: "derby", label: "Derby", defaultPort: 1527, icon: `${GEN}/derby_icon_big.png`, category: ["SQL", "Embedded"] },
  { value: "ingres", label: "Ingres", defaultPort: 21071, icon: `${GEN}/ingres_icon_big.png`, category: ["SQL"] },
  { value: "altibase", label: "Altibase", defaultPort: 20300, icon: `${EXT}.altibase/icons/altibase_icon_big.png`, category: ["SQL"] },
  { value: "cubrid", label: "CUBRID", defaultPort: 33000, icon: `${EXT}.cubrid/icons/cubrid_icon_big.png`, category: ["SQL"] },
  { value: "dameng", label: "Dameng", defaultPort: 5236, icon: `${EXT}.dameng/icons/dm_icon_big.png`, category: ["SQL"] },
  { value: "kingbase", label: "Kingbase", defaultPort: 54321, icon: `${EXT}.kingbase/icons/kingbase_icon_big.png`, category: ["SQL"] },
  { value: "gbase8s", label: "GBase 8s", defaultPort: 9088, icon: `${EXT}.gbase8s/icons/gbase8s_icon_big.png`, category: ["SQL"] },
  { value: "nuodb", label: "NuoDB", defaultPort: 48004, icon: `${GEN}/nuodb_icon_big.png`, category: ["SQL"] },
  { value: "babelfish", label: "Babelfish", defaultPort: 1433, icon: `${EXT}.mssql/icons/babelfish_icon_big.png`, category: ["SQL"] },
  { value: "enterprisedb", label: "EnterpriseDB", defaultPort: 5444, icon: `${EXT}.postgresql/icons/edb_icon_big.png`, category: ["SQL"] },
  { value: "iris", label: "InterSystems IRIS", defaultPort: 1972, icon: `${GEN}/intersystems_icon_big.png`, category: ["SQL"] },
  { value: "virtuoso", label: "Virtuoso", defaultPort: 1111, icon: `${GEN}/virtuoso_icon_big.png`, category: ["SQL"] },
  { value: "teiid", label: "Teiid", defaultPort: 31000, icon: `${GEN}/teiid_icon_big.png`, category: ["SQL"] },
  { value: "maxdb", label: "MaxDB", defaultPort: 7210, icon: `${GEN}/sap_maxdb_icon_big.png`, category: ["SQL"] },

  // ── Cloud ──
  { value: "snowflake", label: "Snowflake", defaultPort: 443, icon: `${EXT}.snowflake/icons/snowflake_icon_big.png`, category: ["Popular", "Cloud", "Analytical"] },
  { value: "redshift", label: "Amazon Redshift", defaultPort: 5439, icon: FALLBACK, category: ["Cloud", "Analytical"] },
  { value: "athena", label: "Amazon Athena", defaultPort: 443, icon: `${EXT}.athena/icons/aws_athena_logo.png`, category: ["Cloud", "Analytical"] },
  { value: "bigquery", label: "Google BigQuery", defaultPort: 443, icon: `${EXT}.bigquery/icons/bigquery_icon_big.png`, category: ["Cloud", "Analytical"] },
  { value: "spanner", label: "Google Spanner", defaultPort: 443, icon: `${EXT}.spanner/icons/spanner_icon_big.png`, category: ["Cloud", "SQL"] },
  { value: "azuresql", label: "Azure SQL", defaultPort: 1433, icon: `${EXT}.mssql/icons/azure_sql_server_icon_big.png`, category: ["Cloud", "SQL"] },
  { value: "databricks", label: "Databricks", defaultPort: 443, icon: `${GEN}/databricks_icon_big.png`, category: ["Cloud", "Analytical"] },
  { value: "salesforce", label: "Salesforce", defaultPort: 443, icon: FALLBACK, category: ["Cloud"] },
  { value: "datavirtuality", label: "Data Virtuality", defaultPort: 35432, icon: FALLBACK, category: ["Cloud"] },
  { value: "denodo", label: "Denodo", defaultPort: 9999, icon: `${EXT}.denodo/icons/denodo_icon_big.png`, category: ["Cloud"] },

  // ── Analytical ──
  { value: "vertica", label: "Vertica", defaultPort: 5433, icon: `${EXT}.vertica/icons/vertica_icon_big.png`, category: ["Analytical"] },
  { value: "teradata", label: "Teradata", defaultPort: 1025, icon: `${GEN}/teradata_icon_big.png`, category: ["Analytical"] },
  { value: "exasol", label: "Exasol", defaultPort: 8563, icon: `${EXT}.exasol/icons/exasol_icon_big.png`, category: ["Analytical"] },
  { value: "netezza", label: "Netezza", defaultPort: 5480, icon: `${GEN}/netezza_icon_big.png`, category: ["Analytical"] },
  { value: "greenplum", label: "Greenplum", defaultPort: 5432, icon: `${EXT}.greenplum/icons/greenplum_icon_big.png`, category: ["Analytical"] },
  { value: "monetdb", label: "MonetDB", defaultPort: 50000, icon: `${GEN}/monetdb_icon_big.png`, category: ["Analytical"] },
  { value: "druid", label: "Apache Druid", defaultPort: 8888, icon: `${GEN}/apache_icon_big.png`, category: ["Analytical"] },
  { value: "kylin", label: "Apache Kylin", defaultPort: 7070, icon: `${GEN}/apache_icon_big.png`, category: ["Analytical"] },
  { value: "starrocks", label: "StarRocks", defaultPort: 9030, icon: `${EXT}.mysql/icons/starRocks_icon_big.png`, category: ["Analytical"] },
  { value: "materialize", label: "Materialize", defaultPort: 6875, icon: `${EXT}.postgresql/icons/materialize_icon_big.png`, category: ["Analytical"] },
  { value: "dolphindb", label: "DolphinDB", defaultPort: 8848, icon: `${GEN}/dolphindb_icon_big.png`, category: ["Analytical"] },
  { value: "databend", label: "Databend", defaultPort: 8000, icon: `${EXT}.databend/icons/databend_icon_big.png`, category: ["Analytical", "Cloud"] },
  { value: "cloudberry", label: "Cloudberry", defaultPort: 5432, icon: `${EXT}.greenplum/icons/cloudberry_icon_big.png`, category: ["Analytical"] },
  { value: "presto", label: "Presto", defaultPort: 8080, icon: `${GEN}/presto_icon_big.png`, category: ["Analytical", "Hadoop / BigData"] },
  { value: "trino", label: "Trino", defaultPort: 8080, icon: `${GEN}/trino_icon_big.png`, category: ["Analytical", "Hadoop / BigData"] },
  { value: "saphana", label: "SAP HANA", defaultPort: 30015, icon: `${EXT}.hana/icons/sap_hana_icon_big.png`, category: ["Analytical"] },
  { value: "yellowbrick", label: "Yellowbrick", defaultPort: 5432, icon: `${EXT}.postgresql/icons/yellowbrick_icon_big.png`, category: ["Analytical"] },
  { value: "ocient", label: "Ocient", defaultPort: 4050, icon: `${EXT}.ocient/icons/ocient_icon_big.png`, category: ["Analytical"] },
  { value: "gaussdb", label: "GaussDB", defaultPort: 25308, icon: `${EXT}.gaussdb/icons/gaussdb_icon_big.png`, category: ["Analytical"] },

  // ── NoSQL ──
  { value: "cockroachdb", label: "CockroachDB", defaultPort: 26257, icon: `${EXT}.postgresql/icons/cockroach_icon_big.png`, category: ["NoSQL", "SQL"] },
  { value: "tidb", label: "TiDB", defaultPort: 4000, icon: `${EXT}.tidb/icons/tidb_icon_big.png`, category: ["NoSQL", "SQL"] },
  { value: "yugabyte", label: "YugabyteDB", defaultPort: 5433, icon: `${EXT}.postgresql/icons/yugabyte_icon_big.png`, category: ["NoSQL", "SQL"] },
  { value: "oceanbase", label: "OceanBase", defaultPort: 2881, icon: `${EXT}.oceanbase/icons/ob_icon_big.png`, category: ["NoSQL", "SQL"] },
  { value: "cratedb", label: "CrateDB", defaultPort: 4200, icon: `${GEN}/cratedb_icon_big.png`, category: ["NoSQL"] },

  // ── Hadoop / BigData ──
  { value: "hive", label: "Apache Hive", defaultPort: 10000, icon: `${GEN}/hive_icon_big.png`, category: ["Hadoop / BigData"] },
  { value: "impala", label: "Apache Impala", defaultPort: 21050, icon: `${GEN}/impala_icon_big.png`, category: ["Hadoop / BigData"] },
  { value: "spark", label: "Apache Spark", defaultPort: 10000, icon: `${GEN}/spark_hive_icon_big.png`, category: ["Hadoop / BigData"] },
  { value: "drill", label: "Apache Drill", defaultPort: 8047, icon: `${GEN}/drill_icon_big.png`, category: ["Hadoop / BigData"] },
  { value: "phoenix", label: "Apache Phoenix", defaultPort: 8765, icon: `${GEN}/phoenix_icon_big.png`, category: ["Hadoop / BigData"] },
  { value: "ignite", label: "Apache Ignite", defaultPort: 10800, icon: `${GEN}/ignite_icon_big.png`, category: ["Hadoop / BigData"] },
  { value: "mapd", label: "MapD / HeavyDB", defaultPort: 6274, icon: FALLBACK, category: ["Hadoop / BigData"] },
  { value: "omnisci", label: "OmniSci", defaultPort: 6274, icon: `${GEN}/omnisci_icon_big.png`, category: ["Hadoop / BigData"] },

  // ── Timeseries ──
  { value: "timescaledb", label: "TimescaleDB", defaultPort: 5432, icon: `${EXT}.postgresql/icons/timescale_icon_big.png`, category: ["Timeseries"] },
  { value: "tdengine", label: "TDEngine", defaultPort: 6041, icon: `${GEN}/tdengine_icon_big.png`, category: ["Timeseries"] },
  { value: "machbase", label: "Machbase", defaultPort: 5656, icon: `${GEN}/machbase_icon_big.png`, category: ["Timeseries"] },

  // ── Embedded ──
  { value: "sqlite", label: "SQLite", defaultPort: 0, icon: `${EXT}.sqlite/icons/sqlite_icon_big.png`, category: ["Popular", "Embedded"] },
  { value: "h2", label: "H2", defaultPort: 9092, icon: `${GEN}/h2_icon_big.png`, category: ["Embedded"] },
  { value: "h2gis", label: "H2GIS", defaultPort: 9092, icon: `${EXT}.h2/icons/h2gis_icon_big.png`, category: ["Embedded"] },
  { value: "duckdb", label: "DuckDB", defaultPort: 0, icon: `${GEN}/duckdb_icon_big.png`, category: ["Embedded", "Analytical"] },
  { value: "libsql", label: "LibSQL", defaultPort: 8080, icon: `${EXT}.sqlite/icons/libsql_icon_big.png`, category: ["Embedded"] },

  // ── Files ──
  { value: "csv", label: "CSV", defaultPort: 0, icon: `${GEN}/csv_icon_big.png`, category: ["Files"] },
  { value: "dbf", label: "DBF", defaultPort: 0, icon: `${GEN}/dbf_icon_big.png`, category: ["Files"] },
  { value: "msaccess", label: "MS Access", defaultPort: 0, icon: `${GEN}/msaccess_icon_big.png`, category: ["Files"] },

  // ── Search ──
  { value: "elasticsearch", label: "Elasticsearch", defaultPort: 9200, icon: `${GEN}/elasticsearch_icon_big.png`, category: ["Search", "NoSQL"] },
  { value: "opensearch", label: "OpenSearch", defaultPort: 9200, icon: `${GEN}/opensearch_icon_big.png`, category: ["Search", "NoSQL"] },

  // ── Graph ──
  { value: "orientdb", label: "OrientDB", defaultPort: 2424, icon: `${GEN}/orientdb_icon_big.png`, category: ["Graph", "NoSQL"] },

  // ── Other ──
  { value: "wmi", label: "WMI", defaultPort: 0, icon: `${EXT}.wmi/icons/wmi_icon_big.png`, category: ["SQL"] },
  { value: "jdbcx", label: "JDBCX", defaultPort: 0, icon: `${GEN}/jdbcx_icon_big.png`, category: ["SQL"] },
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
