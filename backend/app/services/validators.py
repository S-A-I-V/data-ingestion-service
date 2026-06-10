"""
Input validation and sanitization utilities.

Prevents SQL injection, command injection, and unsafe file uploads.
All validation functions raise ValueError with descriptive messages.
"""

import re

from app.config import settings

# Max CSV file size — driven by settings
MAX_CSV_SIZE_BYTES = settings.MAX_CSV_SIZE_MB * 1024 * 1024

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

# Reserved SQL keywords that should not be used as identifiers
_RESERVED_KEYWORDS = {
    "select",
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "create",
    "table",
    "database",
    "index",
    "from",
    "where",
    "and",
    "or",
    "not",
    "null",
    "true",
    "false",
    "grant",
    "revoke",
    "exec",
    "execute",
}


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
    # Warn on reserved keywords (don't block — some DBs allow quoted keywords)
    if name.lower() in _RESERVED_KEYWORDS:
        raise ValueError(f"{label} '{name}' is a reserved SQL keyword")
    return name


def validate_identifiers(names: list[str], label: str = "column") -> list[str]:
    """Validate a list of SQL identifiers."""
    if not names:
        raise ValueError(f"At least one {label} is required")
    if len(names) > 1000:
        raise ValueError(f"Too many {label}s (max 1000)")
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
    """Validate CSV file upload: extension, size, and filename safety."""
    if not filename:
        raise ValueError("No filename provided")
    # Check extension
    if not filename.lower().endswith(".csv"):
        raise ValueError("Only .csv files are allowed")
    # Check filename for path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValueError("Invalid filename — path traversal detected")
    # Check size
    if size > MAX_CSV_SIZE_BYTES:
        raise ValueError(f"File too large (max {settings.MAX_CSV_SIZE_MB} MB)")
    if size == 0:
        raise ValueError("File is empty")


def sanitize_string(value: str, max_length: int = 255) -> str:
    """Strip, truncate, and remove control characters from a string input."""
    if not value:
        return ""
    # Remove control characters (except newline/tab)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)
    return cleaned.strip()[:max_length]


def validate_port(port: int) -> int:
    """Validate port number range."""
    if not isinstance(port, int):
        raise ValueError(f"Port must be an integer, got {type(port).__name__}")
    if not (1 <= port <= 65535):
        raise ValueError(f"Invalid port: {port} — must be between 1 and 65535")
    return port


def validate_host(host: str) -> str:
    """
    Validate hostname — prevents injection, path traversal, and embedded metadata.

    Allows:
      - hostnames (db.example.com)
      - IP addresses (192.168.1.1)
      - Cloud endpoints (my-cluster.us-east-1.rds.amazonaws.com)

    Rejects:
      - Embedded ports (host:5432)
      - Embedded paths (host/database)
      - Injection characters (; ' " ` \\ etc.)
    """
    host = host.strip()
    if not host:
        raise ValueError("Host cannot be empty")
    if len(host) > 255:
        raise ValueError("Host too long (max 255 characters)")
    if any(c in host for c in [";", "'", '"', "`", "\\", " ", "\n", "\r", "\t"]):
        raise ValueError(f"Invalid characters in host: '{host}'")
    if "/" in host:
        raise ValueError("Host must not contain a path — enter the database name in the Database field")
    if ":" in host:
        raise ValueError("Host must not contain a port — enter the port number in the Port field")
    # Basic hostname/IP pattern validation
    hostname_pattern = re.compile(r"^[a-zA-Z0-9]([a-zA-Z0-9\-._]*[a-zA-Z0-9])?$")
    if not hostname_pattern.match(host):
        raise ValueError(f"Invalid hostname format: '{host}'")
    return host


def validate_email(email: str) -> str:
    """Basic email format validation."""
    email = email.strip().lower()
    if not email:
        raise ValueError("Email cannot be empty")
    if len(email) > 320:
        raise ValueError("Email too long")
    pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    if not pattern.match(email):
        raise ValueError(f"Invalid email format: '{email}'")
    return email
