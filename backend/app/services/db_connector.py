"""
Database connector abstraction. Each DB type implements a common interface:
  - test(): verify connectivity
  - list_tables(): return list of table names
  - list_columns(table): return list of {name, type, nullable}
  - insert_rows(table, columns, rows): bulk insert

Most SQL databases use SQLAlchemy dialects via SQLAlchemyConnector.
Specialty databases (ClickHouse, etc.) have native connectors.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any

from app.models.connection import DBConnection


# ─── Base ────────────────────────────────────────────────────────────────────

class BaseConnector(ABC):
    def __init__(self, conn: DBConnection):
        self.conn = conn

    @abstractmethod
    def test(self): ...

    @abstractmethod
    def list_tables(self) -> List[str]: ...

    @abstractmethod
    def list_columns(self, table: str) -> List[Dict[str, Any]]: ...

    @abstractmethod
    def insert_rows(self, table: str, columns: List[str], rows: List[List[Any]]) -> int: ...

    def insert_rows_skip_existing(
        self, table: str, columns: List[str], rows: List[List[Any]], key_columns: List[str]
    ) -> Dict[str, int]:
        """Insert only rows whose key_columns values don't already exist in the table.
        Returns {"inserted": N, "skipped": M}."""
        # Default: just insert all (subclasses override for real dedup)
        count = self.insert_rows(table, columns, rows)
        return {"inserted": count, "skipped": 0}


# ─── Generic SQLAlchemy connector ────────────────────────────────────────────

class SQLAlchemyConnector(BaseConnector):
    """Base for any DB reachable via a SQLAlchemy connection URL."""

    def _url(self) -> str:
        raise NotImplementedError("Subclass must implement _url()")

    def _safe(self, val: str) -> str:
        """URL-encode a value for use in connection strings."""
        from urllib.parse import quote_plus
        return quote_plus(val or "")

    def _engine_kwargs(self) -> dict:
        return {}

    def _engine(self):
        from sqlalchemy import create_engine
        return create_engine(
            self._url(),
            connect_args={"connect_timeout": self.conn.connection_timeout or 30}
            if "connect_timeout" not in str(self._engine_kwargs())
            else {},
            **self._engine_kwargs(),
        )

    # ── Schema queries (override per-dialect if needed) ──

    def _test_query(self) -> str:
        return "SELECT 1"

    def _list_tables_query(self) -> str:
        return (
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' ORDER BY table_name"
        )

    def _list_columns_query(self) -> str:
        return (
            "SELECT column_name, data_type, is_nullable "
            "FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :t "
            "ORDER BY ordinal_position"
        )

    def _quote(self, name: str) -> str:
        return f'"{name}"'

    # ── Interface ──

    def test(self):
        from sqlalchemy import text
        with self._engine().connect() as c:
            c.execute(text(self._test_query()))

    def list_tables(self) -> List[str]:
        from sqlalchemy import text
        with self._engine().connect() as c:
            rows = c.execute(text(self._list_tables_query()))
            return [r[0] for r in rows]

    def list_columns(self, table: str) -> List[Dict[str, Any]]:
        from sqlalchemy import text
        with self._engine().connect() as c:
            rows = c.execute(text(self._list_columns_query()), {"t": table})
            return [{"name": r[0], "type": r[1], "nullable": r[2] == "YES"} for r in rows]

    def insert_rows(self, table: str, columns: List[str], rows: List[List[Any]]) -> int:
        from sqlalchemy import text
        placeholders = ", ".join([f":{c}" for c in columns])
        cols = ", ".join([self._quote(c) for c in columns])
        sql = f"INSERT INTO {self._quote(table)} ({cols}) VALUES ({placeholders})"
        with self._engine().begin() as c:
            for row in rows:
                c.execute(text(sql), dict(zip(columns, row)))
        return len(rows)

    def insert_rows_skip_existing(
        self, table: str, columns: List[str], rows: List[List[Any]], key_columns: List[str]
    ) -> Dict[str, int]:
        from sqlalchemy import text

        if not rows:
            return {"inserted": 0, "skipped": 0}

        # Build key column indices
        key_indices = [columns.index(k) for k in key_columns]

        # Fetch existing key combinations from the table
        key_cols_quoted = ", ".join([self._quote(k) for k in key_columns])
        existing_keys = set()
        with self._engine().connect() as c:
            result = c.execute(text(f"SELECT {key_cols_quoted} FROM {self._quote(table)}"))
            for r in result:
                existing_keys.add(tuple(str(v) for v in r))

        # Filter out rows that already exist
        new_rows = []
        for row in rows:
            key = tuple(str(row[i]) for i in key_indices)
            if key not in existing_keys:
                new_rows.append(row)

        skipped = len(rows) - len(new_rows)
        if new_rows:
            self.insert_rows(table, columns, new_rows)
        return {"inserted": len(new_rows), "skipped": skipped}


# ─── PostgreSQL ──────────────────────────────────────────────────────────────
# Driver: psycopg2-binary

class PostgresConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"postgresql://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"


# ─── MySQL ───────────────────────────────────────────────────────────────────
# Driver: pymysql

class MySQLConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        ssl = "?ssl=true" if self.conn.use_ssl else ""
        return f"mysql+pymysql://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}{ssl}"

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"

    def _list_columns_query(self) -> str:
        return (
            "SELECT column_name, data_type, is_nullable "
            "FROM information_schema.columns "
            "WHERE table_schema = DATABASE() AND table_name = :t "
            "ORDER BY ordinal_position"
        )

    def _quote(self, name: str) -> str:
        return f"`{name}`"


# ─── MariaDB ─────────────────────────────────────────────────────────────────
# Driver: pymysql (same as MySQL)

class MariaDBConnector(MySQLConnector):
    def _url(self) -> str:
        ssl = "?ssl=true" if self.conn.use_ssl else ""
        return f"mariadb+pymysql://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}{ssl}"


# ─── SQL Server (MSSQL) ─────────────────────────────────────────────────────
# Driver: pyodbc

class MSSQLConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"mssql+pyodbc://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
            f"?driver=ODBC+Driver+17+for+SQL+Server"
        )

    def _list_tables_query(self) -> str:
        return (
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_type = 'BASE TABLE' ORDER BY table_name"
        )

    def _list_columns_query(self) -> str:
        return (
            "SELECT column_name, data_type, is_nullable "
            "FROM information_schema.columns "
            "WHERE table_name = :t ORDER BY ordinal_position"
        )

    def _quote(self, name: str) -> str:
        return f"[{name}]"


# ─── Oracle ──────────────────────────────────────────────────────────────────
# Driver: oracledb (thin mode, no Oracle client needed)

class OracleConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"oracle+oracledb://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        )

    def _list_tables_query(self) -> str:
        return "SELECT table_name FROM user_tables ORDER BY table_name"

    def _list_columns_query(self) -> str:
        return (
            "SELECT column_name, data_type, "
            "CASE WHEN nullable = 'Y' THEN 'YES' ELSE 'NO' END AS is_nullable "
            "FROM user_tab_columns WHERE table_name = UPPER(:t) ORDER BY column_id"
        )


# ─── Snowflake ───────────────────────────────────────────────────────────────
# Driver: snowflake-sqlalchemy + snowflake-connector-python

class SnowflakeConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        account = self.conn.host.replace(".snowflakecomputing.com", "")
        return (
            f"snowflake://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{account}/{self.conn.database}"
        )

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"

    def _list_columns_query(self) -> str:
        return (
            "SELECT column_name, data_type, is_nullable "
            "FROM information_schema.columns "
            "WHERE table_schema = 'PUBLIC' AND table_name = :t "
            "ORDER BY ordinal_position"
        )


# ─── Amazon Redshift ─────────────────────────────────────────────────────────
# Driver: redshift_connector via sqlalchemy-redshift

class RedshiftConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"redshift+redshift_connector://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        )


# ─── Google BigQuery ─────────────────────────────────────────────────────────
# Driver: sqlalchemy-bigquery (uses application default credentials or service account)

class BigQueryConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        # database field = project_id/dataset
        return f"bigquery://{self.conn.database}"

    def _list_tables_query(self) -> str:
        return (
            "SELECT table_name FROM INFORMATION_SCHEMA.TABLES "
            "ORDER BY table_name"
        )

    def _list_columns_query(self) -> str:
        return (
            "SELECT column_name, data_type, is_nullable "
            "FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE table_name = @t ORDER BY ordinal_position"
        )


# ─── SQLite ──────────────────────────────────────────────────────────────────
# Driver: built-in (sqlite3)

class SQLiteConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        # database field = file path
        return f"sqlite:///{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

    def _list_columns_query(self) -> str:
        # SQLite doesn't support information_schema; use pragma via raw query
        return "SELECT name, type, CASE WHEN \"notnull\" = 0 THEN 'YES' ELSE 'NO' END FROM pragma_table_info(:t)"


# ─── CockroachDB ─────────────────────────────────────────────────────────────
# Driver: psycopg2 (PostgreSQL wire protocol)

class CockroachDBConnector(PostgresConnector):
    def _url(self) -> str:
        ssl = "?sslmode=verify-full" if self.conn.use_ssl else "?sslmode=disable"
        return (
            f"cockroachdb://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}{ssl}"
        )


# ─── ClickHouse ──────────────────────────────────────────────────────────────
# Driver: clickhouse-connect (native, not SQLAlchemy)

class ClickHouseConnector(BaseConnector):
    def _client(self):
        import clickhouse_connect
        return clickhouse_connect.get_client(
            host=self.conn.host,
            port=self.conn.port,
            username=self.conn.username,
            password=self.conn.password,
            database=self.conn.database,
            secure=self.conn.use_ssl or self.conn.port == 443,
        )

    def test(self):
        client = self._client()
        client.command("SELECT 1")
        client.close()

    def list_tables(self) -> List[str]:
        client = self._client()
        result = client.command(f"SHOW TABLES FROM {self.conn.database}")
        client.close()
        return result.split("\n") if result else []

    def list_columns(self, table: str) -> List[Dict[str, Any]]:
        client = self._client()
        rows = client.query(f"DESCRIBE TABLE {self.conn.database}.{table}").result_rows
        client.close()
        return [{"name": r[0], "type": r[1], "nullable": "Nullable" in r[1]} for r in rows]

    def insert_rows(self, table: str, columns: List[str], rows: List[List[Any]]) -> int:
        client = self._client()
        client.insert(f"{self.conn.database}.{table}", rows, column_names=columns)
        client.close()
        return len(rows)

    def insert_rows_skip_existing(
        self, table: str, columns: List[str], rows: List[List[Any]], key_columns: List[str]
    ) -> Dict[str, int]:
        if not rows:
            return {"inserted": 0, "skipped": 0}

        client = self._client()
        key_indices = [columns.index(k) for k in key_columns]

        # Fetch existing key combinations
        key_cols_str = ", ".join(key_columns)
        result = client.query(f"SELECT {key_cols_str} FROM {self.conn.database}.{table}")
        existing_keys = set()
        for r in result.result_rows:
            existing_keys.add(tuple(str(v) for v in r))

        # Filter
        new_rows = []
        for row in rows:
            key = tuple(str(row[i]) for i in key_indices)
            if key not in existing_keys:
                new_rows.append(row)

        skipped = len(rows) - len(new_rows)
        if new_rows:
            client.insert(f"{self.conn.database}.{table}", new_rows, column_names=columns)
        client.close()
        return {"inserted": len(new_rows), "skipped": skipped}


# ─── Vertica ─────────────────────────────────────────────────────────────────
# Driver: vertica-python via sqlalchemy-vertica

class VerticaConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"vertica+vertica_python://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        )


# ─── Teradata ────────────────────────────────────────────────────────────────
# Driver: teradatasqlalchemy + teradatasql

class TeradataConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"teradatasql://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}/{self.conn.database}"
        )

    def _list_tables_query(self) -> str:
        return (
            "SELECT TableName FROM DBC.TablesV "
            "WHERE DatabaseName = DATABASE AND TableKind = 'T' ORDER BY TableName"
        )

    def _list_columns_query(self) -> str:
        return (
            "SELECT ColumnName, ColumnType, "
            "CASE WHEN Nullable = 'Y' THEN 'YES' ELSE 'NO' END "
            "FROM DBC.ColumnsV WHERE DatabaseName = DATABASE AND TableName = :t "
            "ORDER BY ColumnId"
        )


# ─── Exasol ──────────────────────────────────────────────────────────────────
# Driver: sqlalchemy-exasol + pyexasol

class ExasolConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"exa+pyodbc://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        )


# ─── SAP HANA ────────────────────────────────────────────────────────────────
# Driver: sqlalchemy-hana + hdbcli

class SAPHANAConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"hana+hdbcli://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}"
        )

    def _list_tables_query(self) -> str:
        return (
            "SELECT table_name FROM tables "
            "WHERE schema_name = CURRENT_SCHEMA ORDER BY table_name"
        )

    def _list_columns_query(self) -> str:
        return (
            "SELECT column_name, data_type_name, is_nullable "
            "FROM table_columns WHERE schema_name = CURRENT_SCHEMA AND table_name = :t "
            "ORDER BY position"
        )


# ─── Firebird ────────────────────────────────────────────────────────────────
# Driver: sqlalchemy-firebird + firebird-driver

class FirebirdConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"firebird+firebird://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        )

    def _list_tables_query(self) -> str:
        return (
            "SELECT TRIM(rdb$relation_name) FROM rdb$relations "
            "WHERE rdb$system_flag = 0 AND rdb$view_blr IS NULL "
            "ORDER BY rdb$relation_name"
        )


# ─── DuckDB ──────────────────────────────────────────────────────────────────
# Driver: duckdb_engine

class DuckDBConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"duckdb:///{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name"


# ─── Apache Hive ─────────────────────────────────────────────────────────────
# Driver: pyhive

class HiveConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"hive://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        )

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


# ─── Presto / Trino ──────────────────────────────────────────────────────────
# Driver: sqlalchemy-trino / pyhive[presto]

class PrestoConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"presto://{self.conn.username}@{self.conn.host}:{self.conn.port}"
            f"/{self.conn.database}"
        )

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


class TrinoConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"trino://{self.conn.username}@{self.conn.host}:{self.conn.port}"
            f"/{self.conn.database}"
        )

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


# ─── Apache Spark SQL ────────────────────────────────────────────────────────
# Driver: pyhive[hive]

class SparkConnector(HiveConnector):
    pass


# ─── Apache Drill ────────────────────────────────────────────────────────────
# Driver: sqlalchemy-drill

class DrillConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"drill+sadrill://{self.conn.host}:{self.conn.port}/{self.conn.database}?use_ssl={self.conn.use_ssl}"

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


# ─── Elasticsearch / OpenSearch ──────────────────────────────────────────────
# Driver: elasticsearch-dbapi

class ElasticsearchConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        scheme = "https" if self.conn.use_ssl else "http"
        return (
            f"elasticsearch+{scheme}://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/"
        )

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


class OpenSearchConnector(ElasticsearchConnector):
    pass


# ─── Databricks ──────────────────────────────────────────────────────────────
# Driver: databricks-sql-connector + sqlalchemy-databricks

class DatabricksConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"databricks://token:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        )

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


# ─── TiDB ────────────────────────────────────────────────────────────────────
# Driver: pymysql (MySQL wire protocol)

class TiDBConnector(MySQLConnector):
    pass


# ─── YugabyteDB ──────────────────────────────────────────────────────────────
# Driver: psycopg2 (PostgreSQL wire protocol)

class YugabyteConnector(PostgresConnector):
    pass


# ─── OceanBase ───────────────────────────────────────────────────────────────
# Driver: pymysql (MySQL-compatible mode)

class OceanBaseConnector(MySQLConnector):
    pass


# ─── StarRocks ───────────────────────────────────────────────────────────────
# Driver: pymysql (MySQL wire protocol)

class StarRocksConnector(MySQLConnector):
    pass


# ─── TimescaleDB ─────────────────────────────────────────────────────────────
# Driver: psycopg2 (PostgreSQL extension)

class TimescaleDBConnector(PostgresConnector):
    pass


# ─── Greenplum ───────────────────────────────────────────────────────────────
# Driver: psycopg2 (PostgreSQL wire protocol)

class GreenplumConnector(PostgresConnector):
    pass


# ─── Amazon Athena ───────────────────────────────────────────────────────────
# Driver: pyathena

class AthenaConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        # database = schema, host = region, jdbc_url = s3 staging dir
        return (
            f"awsathena+rest://@athena.{self.conn.host}.amazonaws.com:443"
            f"/{self.conn.database}?s3_staging_dir={self.conn.jdbc_url or ''}"
        )

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


# ─── Google Spanner ──────────────────────────────────────────────────────────
# Driver: sqlalchemy-spanner

class SpannerConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        # database = projects/PROJECT/instances/INSTANCE/databases/DB
        return f"spanner+spanner:///{self.conn.database}"

    def _list_tables_query(self) -> str:
        return (
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = '' ORDER BY table_name"
        )


# ─── Azure SQL ───────────────────────────────────────────────────────────────
# Driver: pyodbc (same as MSSQL)

class AzureSQLConnector(MSSQLConnector):
    pass


# ─── MonetDB ─────────────────────────────────────────────────────────────────
# Driver: sqlalchemy-monetdb + pymonetdb

class MonetDBConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"monetdb://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        )


# ─── DB2 ─────────────────────────────────────────────────────────────────────
# Driver: ibm_db_sa + ibm_db

class DB2Connector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"db2+ibm_db://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        )


# ─── Sybase ──────────────────────────────────────────────────────────────────
# Driver: pyodbc

class SybaseConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"sybase+pyodbc://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
            f"?driver=FreeTDS"
        )

    def _list_tables_query(self) -> str:
        return (
            "SELECT name FROM sysobjects WHERE type = 'U' ORDER BY name"
        )


# ─── Materialize ─────────────────────────────────────────────────────────────
# Driver: psycopg2 (PostgreSQL wire protocol)

class MaterializeConnector(PostgresConnector):
    pass


# ─── CrateDB ────────────────────────────────────────────────────────────────
# Driver: sqlalchemy-cratedb + crate

class CrateDBConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        scheme = "https" if self.conn.use_ssl else "http"
        return f"crate://{self.conn.host}:{self.conn.port}/?schema={self.conn.database}"

    def _list_tables_query(self) -> str:
        return (
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema NOT IN ('sys', 'information_schema', 'pg_catalog', 'blob') "
            "ORDER BY table_name"
        )


# ─── Cloudberry / Databend / Netezza / Informix ─────────────────────────────
# These use PostgreSQL or ODBC wire protocols

class CloudberryConnector(PostgresConnector):
    pass


class DatabendConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        scheme = "https" if self.conn.use_ssl else "http"
        return (
            f"databend://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# CONNECTOR REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

CONNECTORS = {
    # Popular / SQL
    "postgres": PostgresConnector,
    "mysql": MySQLConnector,
    "mariadb": MariaDBConnector,
    "mssql": MSSQLConnector,
    "oracle": OracleConnector,
    "db2": DB2Connector,
    "sybase": SybaseConnector,
    "sqlite": SQLiteConnector,
    "firebird": FirebirdConnector,

    # Cloud
    "snowflake": SnowflakeConnector,
    "redshift": RedshiftConnector,
    "bigquery": BigQueryConnector,
    "athena": AthenaConnector,
    "azuresql": AzureSQLConnector,
    "databricks": DatabricksConnector,
    "spanner": SpannerConnector,

    # Analytical
    "clickhouse": ClickHouseConnector,
    "vertica": VerticaConnector,
    "teradata": TeradataConnector,
    "exasol": ExasolConnector,
    "saphana": SAPHANAConnector,
    "greenplum": GreenplumConnector,
    "monetdb": MonetDBConnector,
    "materialize": MaterializeConnector,
    "starrocks": StarRocksConnector,
    "cratedb": CrateDBConnector,
    "cloudberry": CloudberryConnector,
    "databend": DatabendConnector,
    "duckdb": DuckDBConnector,

    # Hadoop / BigData
    "hive": HiveConnector,
    "presto": PrestoConnector,
    "trino": TrinoConnector,
    "spark": SparkConnector,
    "drill": DrillConnector,

    # Timeseries
    "timescaledb": TimescaleDBConnector,

    # NoSQL / NewSQL
    "cockroachdb": CockroachDBConnector,
    "tidb": TiDBConnector,
    "yugabyte": YugabyteConnector,
    "oceanbase": OceanBaseConnector,

    # Search
    "elasticsearch": ElasticsearchConnector,
    "opensearch": OpenSearchConnector,
}


def get_connector(conn: DBConnection) -> BaseConnector:
    cls = CONNECTORS.get(conn.db_type)
    if not cls:
        raise ValueError(f"Unsupported db_type: {conn.db_type}")
    return cls(conn)
