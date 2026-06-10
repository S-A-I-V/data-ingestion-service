"""
Database connector registry.

Connectors are organized into modules under app.services.connectors:
  - base.py       — BaseConnector, SQLAlchemyConnector
  - sql.py        — Postgres, MySQL, MariaDB, MSSQL, Oracle, SQLite, DB2, Firebird, AzureSQL
  - cloud.py      — Snowflake, Redshift, BigQuery, Athena, Databricks, Spanner
  - analytical.py — ClickHouse, Vertica, Teradata, Exasol, SAP HANA, MonetDB, DuckDB, CrateDB, Databend
  - nosql.py      — CockroachDB, TiDB, Yugabyte, OceanBase, StarRocks, Timescale, Greenplum, Materialize, Cloudberry
  - bigdata.py    — Hive, Presto, Trino, Spark, Drill, Elasticsearch, OpenSearch
  - specialty.py  — Sybase (direct pyodbc)
"""

from app.models.connection import DBConnection

# Analytical
from app.services.connectors.analytical import (
    ClickHouseConnector,
    CrateDBConnector,
    DatabendConnector,
    DuckDBConnector,
    ExasolConnector,
    MonetDBConnector,
    SAPHANAConnector,
    TeradataConnector,
    VerticaConnector,
)
from app.services.connectors.base import BaseConnector

# BigData / Search
from app.services.connectors.bigdata import (
    DrillConnector,
    ElasticsearchConnector,
    HiveConnector,
    OpenSearchConnector,
    PrestoConnector,
    SparkConnector,
    TrinoConnector,
)

# Cloud
from app.services.connectors.cloud import (
    AthenaConnector,
    BigQueryConnector,
    DatabricksConnector,
    RedshiftConnector,
    SnowflakeConnector,
    SpannerConnector,
)

# NoSQL / NewSQL
from app.services.connectors.nosql import (
    CloudberryConnector,
    CockroachDBConnector,
    GreenplumConnector,
    MaterializeConnector,
    OceanBaseConnector,
    StarRocksConnector,
    TiDBConnector,
    TimescaleDBConnector,
    YugabyteConnector,
)

# Specialty
from app.services.connectors.specialty import SybaseConnector

# SQL
from app.services.connectors.sql import (
    AzureSQLConnector,
    DB2Connector,
    FirebirdConnector,
    MariaDBConnector,
    MSSQLConnector,
    MySQLConnector,
    OracleConnector,
    PostgresConnector,
    SQLiteConnector,
)

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
    "azuresql": AzureSQLConnector,
    # Cloud
    "snowflake": SnowflakeConnector,
    "redshift": RedshiftConnector,
    "bigquery": BigQueryConnector,
    "athena": AthenaConnector,
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
    # BigData
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
