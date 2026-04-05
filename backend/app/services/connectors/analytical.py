"""Analytical database connectors: ClickHouse, Vertica, Teradata, Exasol, SAP HANA, etc."""

from typing import List, Dict, Any
from .base import BaseConnector, SQLAlchemyConnector


class ClickHouseConnector(BaseConnector):
    def _client(self):
        import clickhouse_connect
        return clickhouse_connect.get_client(
            host=self.conn.host, port=self.conn.port,
            username=self.conn.username, password=self.conn.password,
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
        key_cols_str = ", ".join(key_columns)
        result = client.query(f"SELECT {key_cols_str} FROM {self.conn.database}.{table}")
        existing_keys = {tuple(str(v) for v in r) for r in result.result_rows}
        new_rows = [row for row in rows if tuple(str(row[i]) for i in key_indices) not in existing_keys]
        skipped = len(rows) - len(new_rows)
        if new_rows:
            client.insert(f"{self.conn.database}.{table}", new_rows, column_names=columns)
        client.close()
        return {"inserted": len(new_rows), "skipped": skipped}


class VerticaConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"vertica+vertica_python://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"


class TeradataConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"teradatasql://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}/{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SELECT TableName FROM DBC.TablesV WHERE DatabaseName = DATABASE AND TableKind = 'T' ORDER BY TableName"

    def _list_columns_query(self) -> str:
        return "SELECT ColumnName, ColumnType, CASE WHEN Nullable = 'Y' THEN 'YES' ELSE 'NO' END FROM DBC.ColumnsV WHERE DatabaseName = DATABASE AND TableName = :t ORDER BY ColumnId"


class ExasolConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"exa+pyodbc://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"


class SAPHANAConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"hana+hdbcli://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}"

    def _list_tables_query(self) -> str:
        return "SELECT table_name FROM tables WHERE schema_name = CURRENT_SCHEMA ORDER BY table_name"

    def _list_columns_query(self) -> str:
        return "SELECT column_name, data_type_name, is_nullable FROM table_columns WHERE schema_name = CURRENT_SCHEMA AND table_name = :t ORDER BY position"


class MonetDBConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"monetdb://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"


class DuckDBConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"duckdb:///{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name"


class CrateDBConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"crate://{self.conn.host}:{self.conn.port}/?schema={self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SELECT table_name FROM information_schema.tables WHERE table_schema NOT IN ('sys', 'information_schema', 'pg_catalog', 'blob') ORDER BY table_name"


class DatabendConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"databend://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"
