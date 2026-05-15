/**
 * DbLogoSection — scrolling marquee of all integrated database logos.
 * Icons are served locally from /images/db-icons/ — no remote fetches.
 */

import { LogoSlider } from "./ui/LogoSlider";

const I = "/images/db-icons";

const INTEGRATED_DBS = [
  { label: "PostgreSQL", icon: `${I}/postgresql.png` },
  { label: "ClickHouse", icon: `${I}/clickhouse.png` },
  { label: "MySQL", icon: `${I}/mysql.png` },
  { label: "MariaDB", icon: `${I}/mariadb.png` },
  { label: "SQL Server", icon: `${I}/mssql.png` },
  { label: "Oracle", icon: `${I}/oracle.png` },
  { label: "Snowflake", icon: `${I}/snowflake.png` },
  { label: "BigQuery", icon: `${I}/bigquery.png` },
  { label: "Redshift", icon: `${I}/postgresql.png` },
  { label: "Databricks", icon: `${I}/databricks.svg` },
  { label: "Vertica", icon: `${I}/vertica.png` },
  { label: "Teradata", icon: `${I}/teradata.png` },
  { label: "SAP HANA", icon: `${I}/saphana.png` },
  { label: "Sybase", icon: `${I}/sybase.png` },
  { label: "CockroachDB", icon: `${I}/cockroachdb.png` },
  { label: "TimescaleDB", icon: `${I}/timescaledb.png` },
  { label: "Elasticsearch", icon: `${I}/elasticsearch.png` },
  { label: "OpenSearch", icon: `${I}/opensearch.png` },
  { label: "DuckDB", icon: `${I}/duckdb.png` },
  { label: "SQLite", icon: `${I}/sqlite.png` },
  { label: "Greenplum", icon: `${I}/greenplum.png` },
  { label: "Trino", icon: `${I}/trino.png` },
  { label: "Presto", icon: `${I}/presto.png` },
  { label: "Apache Hive", icon: `${I}/hive.png` },
  { label: "Azure SQL", icon: `${I}/azuresql.png` },
  { label: "Spanner", icon: `${I}/spanner.png` },
  { label: "Athena", icon: `${I}/athena.png` },
  { label: "StarRocks", icon: `${I}/starrocks.svg` },
  { label: "TiDB", icon: `${I}/tidb.png` },
  { label: "YugabyteDB", icon: `${I}/yugabyte.png` },
];

export default function DbLogoSection() {
  return (
    <div className="db-logos-section">
      <p className="db-logos-section__title">Databases supported</p>
      <LogoSlider logos={INTEGRATED_DBS} speed={80} direction="left" />
    </div>
  );
}
