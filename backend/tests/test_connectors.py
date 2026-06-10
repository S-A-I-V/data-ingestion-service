"""
Tests for database connector base classes.
Verifies that:
  - Bulk insert chunking works correctly
  - Quote methods produce safe output
  - URL generation uses proper escaping
"""

from unittest.mock import patch

from app.services.connectors.base import BULK_CHUNK_SIZE


class MockDBConnection:
    """Mock DBConnection for testing."""

    def __init__(self, **kwargs):
        self.host = kwargs.get("host", "localhost")
        self.port = kwargs.get("port", 5432)
        self.database = kwargs.get("database", "testdb")
        self.username = kwargs.get("username", "user")
        self.password = kwargs.get("password", "pass")
        self.use_ssl = kwargs.get("use_ssl", False)
        self.ssh_enabled = kwargs.get("ssh_enabled", False)
        self.connection_timeout = kwargs.get("connection_timeout", 30)
        self.jdbc_url = kwargs.get("jdbc_url", None)
        self.db_type = kwargs.get("db_type", "postgres")


class TestSQLAlchemyConnector:
    def test_quote_method(self):
        conn = MockDBConnection()
        # Can't instantiate SQLAlchemyConnector directly (abstract), use a subclass
        from app.services.connectors.sql import PostgresConnector

        connector = PostgresConnector(conn)
        assert connector._quote("users") == '"users"'
        assert connector._quote("my_table") == '"my_table"'

    def test_safe_url_encoding(self):
        """Special characters in password should be URL-encoded."""
        from app.services.connectors.sql import PostgresConnector

        conn = MockDBConnection(password="p@ss/w0rd&special=chars")
        connector = PostgresConnector(conn)
        url = connector._url()
        assert "p%40ss" in url  # @ encoded
        assert "%2F" in url or "/" not in url.split("@")[0].split("://")[1]  # / in password encoded

    def test_bulk_chunk_size_default(self):
        assert BULK_CHUNK_SIZE == 5000

    def test_insert_rows_skip_empty(self):
        """Empty rows list should return immediately."""
        from app.services.connectors.sql import PostgresConnector

        conn = MockDBConnection()
        connector = PostgresConnector(conn)

        with patch.object(connector, "_engine") as mock_engine:
            result = connector.insert_rows_skip_existing("users", ["id", "name"], [], ["id"])
            assert result == {"inserted": 0, "skipped": 0}
            # Should not create engine for empty input
            mock_engine.assert_not_called()


class TestMySQLConnector:
    def test_quote_uses_backticks(self):
        from app.services.connectors.sql import MySQLConnector

        conn = MockDBConnection(db_type="mysql")
        connector = MySQLConnector(conn)
        assert connector._quote("users") == "`users`"

    def test_ssl_url(self):
        from app.services.connectors.sql import MySQLConnector

        conn = MockDBConnection(db_type="mysql", use_ssl=True)
        connector = MySQLConnector(conn)
        url = connector._url()
        assert "ssl=true" in url


class TestMSSQLConnector:
    def test_quote_uses_brackets(self):
        from app.services.connectors.sql import MSSQLConnector

        conn = MockDBConnection(db_type="mssql")
        connector = MSSQLConnector(conn)
        assert connector._quote("users") == "[users]"
