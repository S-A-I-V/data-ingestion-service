"""Specialty connectors: Sybase (direct pyodbc)."""

from typing import List, Dict, Any
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

    def list_tables(self) -> List[str]:
        c = self._connect()
        cur = c.cursor()
        cur.execute("SELECT name FROM sysobjects WHERE type = 'U' ORDER BY name")
        tables = [row[0] for row in cur.fetchall()]
        c.close()
        return tables

    def list_columns(self, table: str) -> List[Dict[str, Any]]:
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

    def insert_rows(self, table: str, columns: List[str], rows: List[List[Any]]) -> int:
        c = self._connect()
        cur = c.cursor()
        placeholders = ", ".join(["?" for _ in columns])
        cols = ", ".join(columns)
        sql = f"INSERT INTO {table} ({cols}) VALUES ({placeholders})"
        for row in rows:
            cur.execute(sql, row)
        c.commit()
        c.close()
        return len(rows)
