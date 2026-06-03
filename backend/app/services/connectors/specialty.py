"""Specialty connectors: Sybase (direct pyodbc)."""

from __future__ import annotations

from typing import Any

from app.services.validators import validate_identifier

from .base import BaseConnector


class SybaseConnector(BaseConnector):
    """Direct pyodbc connection for Sybase ASE (no SQLAlchemy dialect)."""

    def _connect(self):
        import pyodbc

        conn_str = (
            f"DRIVER={{FreeTDS}};"
            f"SERVER={self.conn.host};"
            f"PORT={self.conn.port};"
            f"DATABASE={self.conn.database};"
            f"UID={self.conn.username};"
            f"PWD={self.conn.password};"
            f"TDS_Version=5.0;"
        )
        return pyodbc.connect(conn_str)

    def test(self):
        c = self._connect()
        c.cursor().execute("SELECT 1")
        c.close()

    def list_tables(self) -> list[str]:
        c = self._connect()
        cur = c.cursor()
        cur.execute("SELECT name FROM sysobjects WHERE type = 'U' ORDER BY name")
        tables = [row[0] for row in cur.fetchall()]
        c.close()
        return tables

    def list_columns(self, table: str) -> list[dict[str, Any]]:
        validate_identifier(table, "table")
        c = self._connect()
        cur = c.cursor()
        cur.execute(
            "SELECT c.name, t.name AS data_type, "
            "CASE WHEN c.status & 8 = 8 THEN 'YES' ELSE 'NO' END "
            "FROM syscolumns c JOIN systypes t ON c.usertype = t.usertype "
            "WHERE c.id = object_id(?) ORDER BY c.colid",
            (table,),
        )
        cols = [{"name": r[0], "type": r[1], "nullable": r[2] == "YES"} for r in cur.fetchall()]
        c.close()
        return cols

    def insert_rows(self, table: str, columns: list[str], rows: list[list[Any]]) -> int:
        validate_identifier(table, "table")
        for col in columns:
            validate_identifier(col, "column")
        c = self._connect()
        cur = c.cursor()
        placeholders = ", ".join(["?" for _ in columns])
        cols = ", ".join(f"[{c}]" for c in columns)
        sql = f"INSERT INTO [{table}] ({cols}) VALUES ({placeholders})"  # noqa: S608
        for row in rows:
            cur.execute(sql, row)
        c.commit()
        c.close()
        return len(rows)

    def execute_query(self, query: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """Execute a read-only query and return results as list of dicts."""
        c = self._connect()
        cur = c.cursor()
        if params:
            # pyodbc uses ? positional params — replace :name with ? and pass values in order
            import re

            param_names = re.findall(r":(\w+)", query)
            sql = re.sub(r":(\w+)", "?", query)
            cur.execute(sql, [params[name] for name in param_names])
        else:
            cur.execute(query)
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        c.close()
        return [dict(zip(columns, row)) for row in rows]
