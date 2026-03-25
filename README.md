# NFC Data Ingestion Service

CSV-to-ClickHouse ingestion service for the `nfc_db/whichever db` database.

Each folder represents a table. Inside each folder is a Python script that reads a CSV file and inserts the data into the corresponding db table.

## Setup

```bash
pip3 install -r <table_folder>/requirements.txt
```

Copy `.env.example` to `.env` inside the table folder and fill in your db credentials.

## Usage

```bash
python3 <table_folder>/ingest_csv_to_db.py <path_to_csv>
```

Example:

```bash
python3 users/ingest_csv_to_db.py ~/Downloads/my_data.csv
```
