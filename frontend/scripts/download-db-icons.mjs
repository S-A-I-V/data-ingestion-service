/**
 * Downloads all database icons used in the app to frontend/public/images/db-icons/
 * Run with: node frontend/scripts/download-db-icons.mjs
 */

import { createWriteStream, mkdirSync, existsSync } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import https from "https";
import http from "http";

const OUT_DIR = new URL("../public/images/db-icons/", import.meta.url).pathname;

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const DB = "https://raw.githubusercontent.com/dbeaver/dbeaver/devel/plugins";
const EXT = `${DB}/org.jkiss.dbeaver.ext`;
const GEN = `${EXT}.generic/icons`;

// All icons used across database.ts and DbLogoSection.tsx
const ICONS = [
  // PostgreSQL family
  { file: "postgresql.png", url: `${EXT}.postgresql/icons/postgresql_icon_big.png` },
  { file: "cockroachdb.png", url: `${EXT}.postgresql/icons/cockroach_icon_big.png` },
  { file: "yugabyte.png", url: `${EXT}.postgresql/icons/yugabyte_icon_big.png` },
  { file: "timescaledb.png", url: `${EXT}.postgresql/icons/timescale_icon_big.png` },
  { file: "materialize.png", url: `${EXT}.postgresql/icons/materialize_icon_big.png` },
  { file: "yellowbrick.png", url: `${EXT}.postgresql/icons/yellowbrick_icon_big.png` },
  { file: "edb.png", url: `${EXT}.postgresql/icons/edb_icon_big.png` },
  // MySQL family
  { file: "mysql.png", url: `${EXT}.mysql/icons/mysql_icon_big.png` },
  { file: "mariadb.png", url: `${EXT}.mysql/icons/mariadb_icon_big.png` },
  { file: "starrocks.svg", url: `${DB}/org.jkiss.dbeaver.ext.starrocks/icons/starrocks_icon.svg` },
  // MSSQL family
  { file: "mssql.png", url: `${EXT}.mssql/icons/mssql_icon_big.png` },
  { file: "sybase.png", url: `${EXT}.mssql/icons/sybase_icon_big.png` },
  { file: "azuresql.png", url: `${EXT}.mssql/icons/azure_sql_server_icon_big.png` },
  { file: "babelfish.png", url: `${EXT}.mssql/icons/babelfish_icon_big.png` },
  // Individual databases
  { file: "clickhouse.png", url: `${EXT}.clickhouse/icons/clickhouse_icon_big.png` },
  { file: "oracle.png", url: `${EXT}.oracle/icons/oracle_icon_big.png` },
  { file: "snowflake.png", url: `${EXT}.snowflake/icons/snowflake_icon_big.png` },
  { file: "bigquery.png", url: `${EXT}.bigquery/icons/bigquery_icon_big.png` },
  { file: "spanner.png", url: `${EXT}.spanner/icons/spanner_icon_big.png` },
  { file: "athena.png", url: `${EXT}.athena/icons/aws_athena_logo.png` },
  { file: "databricks.svg", url: `${DB}/org.jkiss.dbeaver.ext.databricks/icons/databricks_icon.svg` },
  { file: "vertica.png", url: `${EXT}.vertica/icons/vertica_icon_big.png` },
  { file: "exasol.png", url: `${EXT}.exasol/icons/exasol_icon_big.png` },
  { file: "greenplum.png", url: `${EXT}.greenplum/icons/greenplum_icon_big.png` },
  { file: "cloudberry.png", url: `${EXT}.greenplum/icons/cloudberry_icon_big.png` },
  { file: "saphana.png", url: `${EXT}.hana/icons/sap_hana_icon_big.png` },
  { file: "sqlite.png", url: `${EXT}.sqlite/icons/sqlite_icon_big.png` },
  { file: "libsql.png", url: `${EXT}.sqlite/icons/libsql_icon_big.png` },
  { file: "firebird.png", url: `${EXT}.firebird/icons/firebird_icon_big.png` },
  { file: "db2.png", url: `${EXT}.db2/icons/db2_icon_big.png` },
  { file: "tidb.png", url: `${EXT}.tidb/icons/tidb_icon_big.png` },
  { file: "oceanbase.png", url: `${EXT}.oceanbase/icons/ob_icon_big.png` },
  { file: "databend.png", url: `${EXT}.databend/icons/databend_icon_big.png` },
  { file: "gaussdb.png", url: `${EXT}.gaussdb/icons/gaussdb_icon_big.png` },
  { file: "altibase.png", url: `${EXT}.altibase/icons/altibase_icon_big.png` },
  { file: "cubrid.png", url: `${EXT}.cubrid/icons/cubrid_icon_big.png` },
  { file: "dameng.png", url: `${EXT}.dameng/icons/dm_icon_big.png` },
  { file: "kingbase.png", url: `${EXT}.kingbase/icons/kingbase_icon_big.png` },
  { file: "denodo.png", url: `${EXT}.denodo/icons/denodo_icon_big.png` },
  { file: "ocient.png", url: `${EXT}.ocient/icons/ocient_icon_big.png` },
  // Generic icons
  { file: "teradata.png", url: `${GEN}/teradata_icon_big.png` },
  { file: "elasticsearch.png", url: `${GEN}/elasticsearch_icon_big.png` },
  { file: "opensearch.png", url: `${GEN}/opensearch_icon_big.png` },
  { file: "duckdb.png", url: `${GEN}/duckdb_icon_big.png` },
  { file: "trino.png", url: `${GEN}/trino_icon_big.png` },
  { file: "presto.png", url: `${GEN}/presto_icon_big.png` },
  { file: "hive.png", url: `${GEN}/hive_icon_big.png` },
  { file: "spark.png", url: `${GEN}/spark_hive_icon_big.png` },
  { file: "drill.png", url: `${GEN}/drill_icon_big.png` },
  { file: "monetdb.png", url: `${GEN}/monetdb_icon_big.png` },
  { file: "cratedb.png", url: `${GEN}/cratedb_icon_big.png` },
  { file: "duckdb.png", url: `${GEN}/duckdb_icon_big.png` },
  { file: "database.png", url: `${DB}/org.jkiss.dbeaver.model/icons/connection/database_icon_big.png` },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      pipeline(res, file).then(resolve).catch(reject);
    });
    req.on("error", reject);
  });
}

// Deduplicate by filename
const seen = new Set();
const unique = ICONS.filter(({ file }) => {
  if (seen.has(file)) return false;
  seen.add(file);
  return true;
});

console.log(`Downloading ${unique.length} icons to ${OUT_DIR}...\n`);

let ok = 0,
  fail = 0;
for (const { file, url } of unique) {
  const dest = path.join(OUT_DIR, file);
  if (existsSync(dest)) {
    console.log(`  ✓ skip  ${file} (already exists)`);
    ok++;
    continue;
  }
  try {
    await download(url, dest);
    console.log(`  ✓ ok    ${file}`);
    ok++;
  } catch (e) {
    console.log(`  ✗ fail  ${file}  (${e.message})`);
    fail++;
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
