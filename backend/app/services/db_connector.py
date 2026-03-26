"""
Database connector abstraction. Each DB type implements a common interface:
  - test(): verify connectivity
  - list_tables(): return list of table names
  - list_columns(table): return list of {name, type, nullable}
  - insert_rows(table, columns, rows): bulk insert
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any

from app.models.connection import DBConnection


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


class PostgresConnector(BaseConnector):
    def _engine(self):
        from sqlalchemy import create_engine
        pwd = f":{self.conn.password}" if self.conn.password else ""
        url = f"postgresql://{self.conn.username}{pwd}@{self.conn.host}:{self.conn.port}/{self.conn.database}"
        return create_engine(url, connect_args={"connect_timeout": self.conn.connection_timeout or 30})

    def test(self):
        from sqlalchemy import text
        with self._engine().connect() as c:
            c.execute(text("SELECT 1"))

    def list_tables(self) -> List[str]:
        from sqlalchemy import text
        with self._engine().connect() as c:
            rows = c.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
            ))
            return [r[0] for r in rows]

    def list_columns(self, table: str) -> List[Dict[str, Any]]:
        from sqlalchemy import text
        with self._engine().connect() as c:
            rows = c.execute(text(
                "SELECT column_name, data_type, is_nullable FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = :t ORDER BY ordinal_position"
            ), {"t": table})
            return [{"name": r[0], "type": r[1], "nullable": r[2] == "YES"} for r in rows]

    def insert_rows(self, table: str, columns: List[str], rows: List[List[Any]]) -> int:
        from sqlalchemy import text
        placeholders = ", ".join([f":{c}" for c in columns])
        sql = f'INSERT INTO "{table}" ({", ".join(columns)}) VALUES ({placeholders})'
        with self._engine().begin() as c:
            for row in rows:
                c.execute(text(sql), dict(zip(columns, row)))
        return len(rows)


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


class SybaseConnector(BaseConnector):
    """Stub — requires pyodbc + FreeTDS driver installed."""

    def test(self):
        raise NotImplementedError("Sybase connector requires pyodbc + FreeTDS. Configure and implement.")

    def list_tables(self) -> List[str]:
        raise NotImplementedError("Sybase connector not yet implemented")

    def list_columns(self, table: str) -> List[Dict[str, Any]]:
        raise NotImplementedError("Sybase connector not yet implemented")

    def insert_rows(self, table: str, columns: List[str], rows: List[List[Any]]) -> int:
        raise NotImplementedError("Sybase connector not yet implemented")


class MySQLConnector(BaseConnector):
    """Requires pymysql: pip install pymysql"""

    def _engine(self):
        from sqlalchemy import create_engine
        ssl = "?ssl=true" if self.conn.use_ssl else ""
        url = f"mysql+pymysql://{self.conn.username}:{self.conn.password}@{self.conn.host}:{self.conn.port}/{self.conn.database}{ssl}"
        return create_engine(url)

    def test(self):
        from sqlalchemy import text
        with self._engine().connect() as c:
            c.execute(text("SELECT 1"))

    def list_tables(self) -> List[str]:
        from sqlalchemy import text
        with self._engine().connect() as c:
            rows = c.execute(text("SHOW TABLES"))
            return [r[0] for r in rows]

    def list_columns(self, table: str) -> List[Dict[str, Any]]:
        from sqlalchemy import text
        with self._engine().connect() as c:
            rows = c.execute(text(
                "SELECT column_name, data_type, is_nullable FROM information_schema.columns "
                "WHERE table_schema = DATABASE() AND table_name = :t ORDER BY ordinal_position"
            ), {"t": table})
            return [{"name": r[0], "type": r[1], "nullable": r[2] == "YES"} for r in rows]

    def insert_rows(self, table: str, columns: List[str], rows: List[List[Any]]) -> int:
        from sqlalchemy import text
        placeholders = ", ".join([f":{c}" for c in columns])
        sql = f"INSERT INTO `{table}` ({', '.join(columns)}) VALUES ({placeholders})"
        with self._engine().begin() as c:
            for row in rows:
                c.execute(text(sql), dict(zip(columns, row)))
        return len(rows)


class MSSQLConnector(BaseConnector):
    """Requires pyodbc: pip install pyodbc"""

    def _engine(self):
        from sqlalchemy import create_engine
        url = f"mssql+pyodbc://{self.conn.username}:{self.conn.password}@{self.conn.host}:{self.conn.port}/{self.conn.database}?driver=ODBC+Driver+17+for+SQL+Server"
        return create_engine(url)

    def test(self):
        from sqlalchemy import text
        with self._engine().connect() as c:
            c.execute(text("SELECT 1"))

    def list_tables(self) -> List[str]:
        from sqlalchemy import text
        with self._engine().connect() as c:
            rows = c.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' ORDER BY table_name"
            ))
            return [r[0] for r in rows]

    def list_columns(self, table: str) -> List[Dict[str, Any]]:
        from sqlalchemy import text
        with self._engine().connect() as c:
            rows = c.execute(text(
                "SELECT column_name, data_type, is_nullable FROM information_schema.columns "
                "WHERE table_name = :t ORDER BY ordinal_position"
            ), {"t": table})
            return [{"name": r[0], "type": r[1], "nullable": r[2] == "YES"} for r in rows]

    def insert_rows(self, table: str, columns: List[str], rows: List[List[Any]]) -> int:
        from sqlalchemy import text
        placeholders = ", ".join([f":{c}" for c in columns])
        sql = f"INSERT INTO [{table}] ({', '.join(columns)}) VALUES ({placeholders})"
        with self._engine().begin() as c:
            for row in rows:
                c.execute(text(sql), dict(zip(columns, row)))
        return len(rows)


CONNECTORS = {
    "postgres": PostgresConnector,
    "clickhouse": ClickHouseConnector,
    "sybase": SybaseConnector,
    "mysql": MySQLConnector,
    "mssql": MSSQLConnector,
}


def get_connector(conn: DBConnection) -> BaseConnector:
    cls = CONNECTORS.get(conn.db_type)
    if not cls:
        raise ValueError(f"Unsupported db_type: {conn.db_type}")
    return cls(conn)
