"""NoSQL / NewSQL / Compatible connectors: CockroachDB, TiDB, Yugabyte, OceanBase, StarRocks, Timescale, etc."""

from .sql import PostgresConnector, MySQLConnector, MSSQLConnector
from .base import SQLAlchemyConnector


class CockroachDBConnector(PostgresConnector):
    def _url(self) -> str:
        ssl = "?sslmode=verify-full" if self.conn.use_ssl else "?sslmode=disable"
        return f"cockroachdb://{self._safe(self.conn.username)}:{self._safe(self.conn.password)}@{self.conn.host}:{self.conn.port}/{self.conn.database}{ssl}"


class TiDBConnector(MySQLConnector):
    pass


class YugabyteConnector(PostgresConnector):
    pass


class OceanBaseConnector(MySQLConnector):
    pass


class StarRocksConnector(MySQLConnector):
    pass


class TimescaleDBConnector(PostgresConnector):
    pass


class GreenplumConnector(PostgresConnector):
    pass


class MaterializeConnector(PostgresConnector):
    pass


class CloudberryConnector(PostgresConnector):
    pass
