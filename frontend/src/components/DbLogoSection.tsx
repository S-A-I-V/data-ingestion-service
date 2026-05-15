/**
 * DbLogoSection — scrolling marquee of all integrated database logos.
 * Only includes databases with real backend connectors.
 */

import { LogoSlider } from "./ui/LogoSlider";

const DB = "https://raw.githubusercontent.com/dbeaver/dbeaver/devel/plugins";
const EXT = `${DB}/org.jkiss.dbeaver.ext`;
const GEN = `${EXT}.generic/icons`;

const INTEGRATED_DBS = [
  { label: "PostgreSQL", icon: `${EXT}.postgresql/icons/postgresql_icon_big.png` },
  { label: "ClickHouse", icon: `${EXT}.clickhouse/icons/clickhouse_icon_big.png` },
  { label: "MySQL", icon: `${EXT}.mysql/icons/mysql_icon_big.png` },
  { label: "MariaDB", icon: `${EXT}.mysql/icons/mariadb_icon_big.png` },
  { label: "SQL Server", icon: `${EXT}.mssql/icons/mssql_icon_big.png` },
  { label: "Oracle", icon: `${EXT}.oracle/icons/oracle_icon_big.png` },
  { label: "Snowflake", icon: `${EXT}.snowflake/icons/snowflake_icon_big.png` },
  { label: "BigQuery", icon: `${EXT}.bigquery/icons/bigquery_icon_big.png` },
  { label: "Redshift", icon: `${EXT}.postgresql/icons/postgresql_icon_big.png` },
  {
    label: "Databricks",
    icon: `https://raw.githubusercontent.com/dbeaver/dbeaver/devel/plugins/org.jkiss.dbeaver.ext.databricks/icons/databricks_icon.svg`,
  },
  { label: "Vertica", icon: `${EXT}.vertica/icons/vertica_icon_big.png` },
  { label: "Teradata", icon: `${GEN}/teradata_icon_big.png` },
  { label: "SAP HANA", icon: `${EXT}.hana/icons/sap_hana_icon_big.png` },
  { label: "Sybase", icon: `${EXT}.mssql/icons/sybase_icon_big.png` },
  { label: "CockroachDB", icon: `${EXT}.postgresql/icons/cockroach_icon_big.png` },
  { label: "TimescaleDB", icon: `${EXT}.postgresql/icons/timescale_icon_big.png` },
  { label: "Elasticsearch", icon: `${GEN}/elasticsearch_icon_big.png` },
  { label: "OpenSearch", icon: `${GEN}/opensearch_icon_big.png` },
  { label: "DuckDB", icon: `${GEN}/duckdb_icon_big.png` },
  { label: "SQLite", icon: `${EXT}.sqlite/icons/sqlite_icon_big.png` },
  { label: "Greenplum", icon: `${EXT}.greenplum/icons/greenplum_icon_big.png` },
  { label: "Trino", icon: `${GEN}/trino_icon_big.png` },
  { label: "Presto", icon: `${GEN}/presto_icon_big.png` },
  { label: "Apache Hive", icon: `${GEN}/hive_icon_big.png` },
  { label: "Azure SQL", icon: `${EXT}.mssql/icons/azure_sql_server_icon_big.png` },
  { label: "Spanner", icon: `${EXT}.spanner/icons/spanner_icon_big.png` },
  { label: "Athena", icon: `${EXT}.athena/icons/aws_athena_logo.png` },
  {
    label: "StarRocks",
    icon: `https://raw.githubusercontent.com/dbeaver/dbeaver/devel/plugins/org.jkiss.dbeaver.ext.starrocks/icons/starrocks_icon.svg`,
  },
  { label: "TiDB", icon: `${EXT}.tidb/icons/tidb_icon_big.png` },
  { label: "YugabyteDB", icon: `${EXT}.postgresql/icons/yugabyte_icon_big.png` },
];

export default function DbLogoSection() {
  return (
    <div className="db-logos-section">
      <p className="db-logos-section__title">Databases supported</p>
      <LogoSlider logos={INTEGRATED_DBS} speed={80} direction="left" />
    </div>
  );
}
