"""Base connector classes: BaseConnector and SQLAlchemyConnector."""

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

    def insert_rows_skip_existing(
        self, table: str, columns: List[str], rows: List[List[Any]], key_columns: List[str]
    ) -> Dict[str, int]:
        """Insert only rows whose key_columns values don't already exist."""
        count = self.insert_rows(table, columns, rows)
        return {"inserted": count, "skipped": 0}


class SQLAlchemyConnector(BaseConnector):
    """Base for any DB reachable via a SQLAlchemy connection URL."""

    def _url(self) -> str:
        raise NotImplementedError("Subclass must implement _url()")

    def _safe(self, val: str) -> str:
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
        key_indices = [columns.index(k) for k in key_columns]
        key_cols_quoted = ", ".join([self._quote(k) for k in key_columns])
        existing_keys = set()
        with self._engine().connect() as c:
            result = c.execute(text(f"SELECT {key_cols_quoted} FROM {self._quote(table)}"))
            for r in result:
                existing_keys.add(tuple(str(v) for v in r))
        new_rows = []
        for row in rows:
            key = tuple(str(row[i]) for i in key_indices)
            if key not in existing_keys:
                new_rows.append(row)
        skipped = len(rows) - len(new_rows)
        if new_rows:
            self.insert_rows(table, columns, new_rows)
        return {"inserted": len(new_rows), "skipped": skipped}
