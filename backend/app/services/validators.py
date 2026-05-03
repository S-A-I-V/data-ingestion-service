"""
Input validation and sanitization utilities.
Prevents SQL injection, command injection, and unsafe file uploads.
"""

import re

# Max CSV file size: 50 MB
MAX_CSV_SIZE_BYTES = 50 * 1024 * 1024

# Allowed DB types (whitelist)
ALLOWED_DB_TYPES = {
    "postgres",
    "mysql",
    "mariadb",
    "mssql",
    "oracle",
    "db2",
    "sybase",
    "sqlite",
    "firebird",
    "azuresql",
    "snowflake",
    "redshift",
    "bigquery",
    "athena",
    "databricks",
    "spanner",
    "clickhouse",
    "vertica",
    "teradata",
    "exasol",
    "saphana",
    "greenplum",
    "monetdb",
    "materialize",
    "starrocks",
    "cratedb",
    "cloudberry",
    "databend",
    "duckdb",
    "hive",
    "presto",
    "trino",
    "spark",
    "drill",
    "timescaledb",
    "cockroachdb",
    "tidb",
    "yugabyte",
    "oceanbase",
    "elasticsearch",
    "opensearch",
}

# Allowed operations
ALLOWED_OPERATIONS = {"INSERT", "INSERT_SKIP", "UPDATE", "UPSERT"}

# SQL identifier pattern: letters, digits, underscores, dots (for schema.table)
_SAFE_IDENTIFIER = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_.]*$")

# Dangerous SQL patterns
_SQL_INJECTION_PATTERNS = re.compile(
    r"(--|;|/\*|\*/|xp_|exec\s|execute\s|drop\s|alter\s|truncate\s|union\s|select\s.*from\s)",
    re.IGNORECASE,
)


def validate_identifier(name: str, label: str = "identifier") -> str:
    """Validate a SQL identifier (table name, column name). Raises ValueError if unsafe."""
    name = name.strip()
    if not name:
        raise ValueError(f"{label} cannot be empty")
    if len(name) > 128:
        raise ValueError(f"{label} too long (max 128 chars)")
    if not _SAFE_IDENTIFIER.match(name):
        raise ValueError(f"Invalid {label}: '{name}' — only letters, digits, underscores, dots allowed")
    if _SQL_INJECTION_PATTERNS.search(name):
        raise ValueError(f"Potentially unsafe {label}: '{name}'")
    return name


def validate_identifiers(names: list[str], label: str = "column") -> list[str]:
    """Validate a list of SQL identifiers."""
    return [validate_identifier(n, label) for n in names]


def validate_db_type(db_type: str) -> str:
    """Validate db_type against whitelist."""
    db_type = db_type.strip().lower()
    if db_type not in ALLOWED_DB_TYPES:
        raise ValueError(f"Unsupported database type: '{db_type}'")
    return db_type


def validate_operation(operation: str) -> str:
    """Validate operation against whitelist."""
    operation = operation.strip().upper()
    if operation not in ALLOWED_OPERATIONS:
        raise ValueError(f"Invalid operation: '{operation}'")
    return operation


def validate_csv_upload(filename: str, size: int) -> None:
    """Validate CSV file upload: extension and size."""
    if not filename:
        raise ValueError("No filename provided")
    if not filename.lower().endswith(".csv"):
        raise ValueError("Only .csv files are allowed")
    if size > MAX_CSV_SIZE_BYTES:
        raise ValueError(f"File too large (max {MAX_CSV_SIZE_BYTES // (1024*1024)} MB)")
    if size == 0:
        raise ValueError("File is empty")


def sanitize_string(value: str, max_length: int = 255) -> str:
    """Strip and truncate a string input."""
    return value.strip()[:max_length] if value else ""


def validate_port(port: int) -> int:
    """Validate port number range."""
    if not (1 <= port <= 65535):
        raise ValueError(f"Invalid port: {port}")
    return port


def validate_host(host: str) -> str:
    """Basic host validation — no spaces, no injection chars, no embedded port/path."""
    host = host.strip()
    if not host:
        raise ValueError("Host cannot be empty")
    if len(host) > 255:
        raise ValueError("Host too long")
    if any(c in host for c in [";", "'", '"', "`", "\\", " ", "\n", "\r"]):
        raise ValueError(f"Invalid characters in host: '{host}'")
    if "/" in host:
        raise ValueError("Host must not contain a path — enter the database name in the Database field")
    if ":" in host:
        raise ValueError("Host must not contain a port — enter the port number in the Port field")
    return host
