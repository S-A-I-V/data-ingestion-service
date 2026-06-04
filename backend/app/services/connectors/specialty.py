"""Specialty connectors: Sybase (direct pyodbc)."""

from __future__ import annotations

import logging
from typing import Any

from app.services.validators import validate_identifier

from .base import BaseConnector

logger = logging.getLogger(__name__)


class SybaseConnectionError(Exception):
    """Raised when Sybase connection cannot be established."""

    def __init__(self, message: str, error_type: str = "connection_error"):
        super().__init__(message)
        self.error_type = error_type


class SybaseConnector(BaseConnector):
    """Direct pyodbc connection for Sybase ASE (no SQLAlchemy dialect)."""

    def _connect(self):
        import pyodbc

        timeout = self.conn.connection_timeout or 30
        conn_str = (
            f"DRIVER={{FreeTDS}};"
            f"SERVER={self.conn.host};"
            f"PORT={self.conn.port};"
            f"DATABASE={self.conn.database};"
            f"UID={self.conn.username};"
            f"PWD={self.conn.password};"
            f"TDS_Version=5.0;"
            f"LoginTimeout={timeout};"
            f"Timeout={timeout};"
        )
        try:
            return pyodbc.connect(conn_str, timeout=timeout)
        except pyodbc.OperationalError as e:
            error_msg = str(e).lower()
            if "connection refused" in error_msg or "errno 111" in error_msg:
                raise SybaseConnectionError(
                    "Connection refused — the database server is not accepting connections. "
                    "Verify the host and port are correct and the service is running.",
                    error_type="connection_refused",
                ) from e
            if "network" in error_msg or "unreachable" in error_msg or "no route" in error_msg:
                raise SybaseConnectionError(
                    "Network unreachable — cannot reach the database server. " "This may require LAN/VPN connectivity.",
                    error_type="network_unreachable",
                ) from e
            if "timed out" in error_msg or "timeout" in error_msg:
                raise SybaseConnectionError(
                    "Connection timed out — the database server did not respond within "
                    f"{timeout} seconds. Check network connectivity or VPN.",
                    error_type="timeout",
                ) from e
            if "login failed" in error_msg or "authentication" in error_msg:
                raise SybaseConnectionError(
                    "Authentication failed — invalid username or password for the database.",
                    error_type="auth_failed",
                ) from e
            # Unknown operational error — still wrap with safe message
            logger.error(f"Sybase connection failed: {e}")
            raise SybaseConnectionError(
                "Unable to connect to the database server. Please verify connection settings.",
                error_type="connection_error",
            ) from e
        except pyodbc.InterfaceError as e:
            logger.error(f"Sybase interface error: {e}")
            raise SybaseConnectionError(
                "Database driver error — FreeTDS driver may not be available or configured correctly.",
                error_type="driver_error",
            ) from e
        except Exception as e:
            logger.error(f"Unexpected Sybase connection error: {e}")
            raise SybaseConnectionError(
                "Unexpected error establishing database connection.",
                error_type="connection_error",
            ) from e

    def test(self):
        c = self._connect()
        try:
            c.cursor().execute("SELECT 1")
        finally:
            c.close()

    def list_tables(self) -> list[str]:
        c = self._connect()
        try:
            cur = c.cursor()
            cur.execute("SELECT name FROM sysobjects WHERE type = 'U' ORDER BY name")
            tables = [row[0] for row in cur.fetchall()]
            return tables
        finally:
            c.close()

    def list_columns(self, table: str) -> list[dict[str, Any]]:
        validate_identifier(table, "table")
        c = self._connect()
        try:
            cur = c.cursor()
            cur.execute(
                "SELECT c.name, t.name AS data_type, "
                "CASE WHEN c.status & 8 = 8 THEN 'YES' ELSE 'NO' END "
                "FROM syscolumns c JOIN systypes t ON c.usertype = t.usertype "
                "WHERE c.id = object_id(?) ORDER BY c.colid",
                (table,),
            )
            cols = [{"name": r[0], "type": r[1], "nullable": r[2] == "YES"} for r in cur.fetchall()]
            return cols
        finally:
            c.close()

    def insert_rows(self, table: str, columns: list[str], rows: list[list[Any]]) -> int:
        validate_identifier(table, "table")
        for col in columns:
            validate_identifier(col, "column")
        c = self._connect()
        try:
            cur = c.cursor()
            placeholders = ", ".join(["?" for _ in columns])
            col_names = ", ".join(f"[{col}]" for col in columns)
            sql = f"INSERT INTO [{table}] ({col_names}) VALUES ({placeholders})"  # noqa: S608
            for row in rows:
                cur.execute(sql, row)
            c.commit()
            return len(rows)
        finally:
            c.close()

    def execute_query(self, query: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """Execute a read-only query and return results as list of dicts."""
        c = self._connect()
        try:
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
            return [dict(zip(columns, row)) for row in rows]
        finally:
            c.close()
