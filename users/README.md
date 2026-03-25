# NFC ClickHouse Data Ingestion Scripts

Python scripts to ingest CSV data into the `nfc_db/whichever DB` database.

## Setup

```bash
pip3 install -r requirements.txt
```

Copy the `.env.example` into each table folder and fill in your credentials:

```bash
cp .env.example users/.env
# then edit users/.env with your credentials
```

## Usage

### Users table

```bash
python3 users/ingest_csv_to_clickhouse.py ~/Downloads/your_file.csv
```

The CSV must have these headers: `businessEntityID`, `associateID`, `firstName`, `middleInitial`, `lastName`, `Email`.

