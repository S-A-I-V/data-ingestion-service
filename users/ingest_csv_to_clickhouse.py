"""
Generic CSV to ClickHouse ingestion script for the `users` table.

Usage:
    python3 ingest_csv_to_clickhouse.py <csv_file_path>

    - CSV file must have headers matching the COLUMN_CONFIG keys below.
    - ClickHouse credentials are read from .env in this directory.
    - Columns like created_at, created_by, updated_at, updated_by are
      handled by ClickHouse defaults and should NOT be in the CSV.
"""

import csv
import os
import sys
import clickhouse_connect
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ClickHouse connection
CH_HOST = os.getenv("CLICKHOUSE_HOST")
CH_USER = os.getenv("CLICKHOUSE_USER")
CH_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD")
CH_DATABASE = "nfc_db"
TABLE_NAME = "users"

# Column config: db_column -> { csv_header, type, nullable }
# Update this if the table schema changes.
COLUMN_CONFIG = {
    "businessEntityID": {"csv": "businessEntityID", "type": "int", "nullable": False},
    "associateID":      {"csv": "associateID",      "type": "int", "nullable": False},
    "firstName":        {"csv": "firstName",         "type": "str", "nullable": False},
    "middleInitial":    {"csv": "middleInitial",     "type": "str", "nullable": True},
    "lastName":         {"csv": "lastName",          "type": "str", "nullable": False},
    "email":            {"csv": "Email",             "type": "str", "nullable": False},
}


def parse_value(raw, col_cfg):
    """Convert a raw CSV string to the appropriate Python type."""
    val = raw.strip() if raw else ""
    if not val:
        return None if col_cfg["nullable"] else val
    if col_cfg["type"] == "int":
        return int(val)
    return val


def read_csv(csv_path):
    """Read CSV and return rows as lists aligned to COLUMN_CONFIG order."""
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        print(f"CSV headers: {reader.fieldnames}")

        # Validate that all expected CSV headers exist
        expected = {cfg["csv"] for cfg in COLUMN_CONFIG.values()}
        found = set(reader.fieldnames or [])
        missing = expected - found
        if missing:
            print(f"ERROR: Missing CSV columns: {missing}")
            sys.exit(1)

        rows = []
        for row in reader:
            rows.append([
                parse_value(row[cfg["csv"]], cfg)
                for cfg in COLUMN_CONFIG.values()
            ])
    return rows


def ingest(client, rows):
    """Insert rows into ClickHouse."""
    db_columns = list(COLUMN_CONFIG.keys())
    client.insert(
        f"{CH_DATABASE}.{TABLE_NAME}",
        rows,
        column_names=db_columns,
    )
    print(f"Inserted {len(rows)} rows into {CH_DATABASE}.{TABLE_NAME}.")


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 ingest_csv_to_clickhouse.py <csv_file_path>")
        sys.exit(1)

    csv_path = os.path.expanduser(sys.argv[1])
    if not os.path.isfile(csv_path):
        print(f"ERROR: File not found: {csv_path}")
        sys.exit(1)

    rows = read_csv(csv_path)
    if not rows:
        print("No data found in CSV.")
        return

    print(f"Read {len(rows)} rows from CSV. Connecting to ClickHouse...")

    client = clickhouse_connect.get_client(
        host=CH_HOST,
        port=443,
        username=CH_USER,
        password=CH_PASSWORD,
        database=CH_DATABASE,
        secure=True,
    )
    ingest(client, rows)
    client.close()


if __name__ == "__main__":
    main()
