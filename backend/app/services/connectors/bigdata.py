"""Hadoop / BigData / Search connectors: Hive, Presto, Trino, Spark, Drill, Elasticsearch, OpenSearch."""

from .base import SQLAlchemyConnector


class HiveConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"hive://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


class PrestoConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"presto://{self.conn.username}@{self.conn.host}:{self.conn.port}/{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


class TrinoConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"trino://{self.conn.username}@{self.conn.host}:{self.conn.port}/{self.conn.database}"

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


class SparkConnector(HiveConnector):
    pass


class DrillConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        return f"drill+sadrill://{self.conn.host}:{self.conn.port}/{self.conn.database}?use_ssl={self.conn.use_ssl}"

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


class ElasticsearchConnector(SQLAlchemyConnector):
    def _url(self) -> str:
        scheme = "https" if self.conn.use_ssl else "http"
        return f"elasticsearch+{scheme}://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/"

    def _list_tables_query(self) -> str:
        return "SHOW TABLES"


class OpenSearchConnector(ElasticsearchConnector):
    pass
