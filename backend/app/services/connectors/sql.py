"""Standard SQL database connectors: Postgres, MySQL, MariaDB, MSSQL, Oracle, SQLite, DB2, Firebird."""

from .base import SQLAlchemyConnector


class PostgresConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"postgresql://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"


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


class MariaDBConnector(MySQLConnector):
    def _url(self) -> str:
        ssl = "?ssl=true" if self.conn.use_ssl else ""
        return f"mariadb+pymysql://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}{ssl}"


class MSSQLConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return (
            f"mssql+pyodbc://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}"
            f"@{self.conn.host}:{self.conn.port}/{self.conn.database}"
            f"?driver=ODBC+Driver+17+for+SQL+Server"
        )

    def _list_tables_query(self) -> str:
        return "SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' ORDER BY table_name"

    def _list_columns_query(self) -> str:
        return "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = :t ORDER BY ordinal_position"

    def _quote(self, name: str) -> str:
        return f"[{name}]"


class OracleConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"oracle+oracledb://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SELECT table_name FROM user_tables ORDER BY table_name"

    def _list_columns_query(self) -> str:
        return (
            "SELECT column_name, data_type, "
            "CASE WHEN nullable = 'Y' THEN 'YES' ELSE 'NO' END AS is_nullable "
            "FROM user_tab_columns WHERE table_name = UPPER(:t) ORDER BY column_id"
        )


class SQLiteConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"sqlite:///{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

    def _list_columns_query(self) -> str:
        return "SELECT name, type, CASE WHEN \"notnull\" = 0 THEN 'YES' ELSE 'NO' END FROM pragma_table_info(:t)"


class DB2Connector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"db2+ibm_db://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"


class FirebirdConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"firebird+firebird://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SELECT TRIM(rdb$relation_name) FROM rdb$relations WHERE rdb$system_flag = 0 AND rdb$view_blr IS NULL ORDER BY rdb$relation_name"


class AzureSQLConnector(MSSQLConnector):
    pass
