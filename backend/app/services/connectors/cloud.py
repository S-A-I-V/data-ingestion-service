"""Cloud database connectors: Snowflake, Redshift, BigQuery, Athena, Databricks, Spanner."""

from .base import SQLAlchemyConnector


class SnowflakeConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        account = self.conn.host.replace(".snowflakecomputing.com", "")
        return f"snowflake://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{account}/{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"

    def _list_columns_query(self) -> str:
        return "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'PUBLIC' AND table_name = :t ORDER BY ordinal_position"


class RedshiftConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"redshift+redshift_connector://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"


class BigQueryConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"bigquery://{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SELECT table_name FROM INFORMATION_SCHEMA.TABLES ORDER BY table_name"

    def _list_columns_query(self) -> str:
        return "SELECT column_name, data_type, is_nullable FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = @t ORDER BY ordinal_position"


class AthenaConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"awsathena+rest://@athena.{self.conn.host}.amazonaws.com:443/{self.conn.database}?s3_staging_dir={self.conn.jdbc_url or ''}"

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


class DatabricksConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"databricks://token:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


class SpannerConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"spanner+spanner:///{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SELECT table_name FROM information_schema.tables WHERE table_schema = '' ORDER BY table_name"
