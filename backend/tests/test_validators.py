"""Tests for input validation — the most critical security surface."""

import pytest

from app.services.validators import (
    validate_csv_upload,
    validate_db_type,
    validate_host,
    validate_identifier,
    validate_operation,
    validate_port,
)


class TestIdentifierValidation:
    def test_valid_table_name(self):
        assert validate_identifier("users", "table") == "users"

    def test_valid_schema_qualified(self):
        assert validate_identifier("nfc_db.users", "table") == "nfc_db.users"

    def test_rejects_sql_injection(self):
        with pytest.raises(ValueError):
            validate_identifier("users; DROP TABLE users", "table")

    def test_rejects_comment_injection(self):
        with pytest.raises(ValueError):
            validate_identifier("users--", "table")

    def test_rejects_empty(self):
        with pytest.raises(ValueError):
            validate_identifier("", "table")

    def test_rejects_too_long(self):
        with pytest.raises(ValueError):
            validate_identifier("a" * 129, "table")

    def test_rejects_special_chars(self):
        with pytest.raises(ValueError):
            validate_identifier("users$table", "table")


class TestDbTypeValidation:
    def test_valid_type(self):
        assert validate_db_type("postgres") == "postgres"

    def test_rejects_unknown(self):
        with pytest.raises(ValueError):
            validate_db_type("mongodb")

    def test_case_insensitive(self):
        assert validate_db_type("POSTGRES") == "postgres"


class TestOperationValidation:
    def test_valid_ops(self):
        for op in ["INSERT", "INSERT_SKIP", "UPDATE", "UPSERT"]:
            assert validate_operation(op) == op

    def test_rejects_delete(self):
        with pytest.raises(ValueError):
            validate_operation("DELETE")


class TestHostValidation:
    def test_valid_host(self):
        assert validate_host("localhost") == "localhost"

    def test_rejects_injection(self):
        with pytest.raises(ValueError):
            validate_host("localhost; rm -rf /")

    def test_rejects_quotes(self):
        with pytest.raises(ValueError):
            validate_host("host'name")


class TestPortValidation:
    def test_valid_port(self):
        assert validate_port(5432) == 5432

    def test_rejects_zero(self):
        with pytest.raises(ValueError):
            validate_port(0)

    def test_rejects_too_high(self):
        with pytest.raises(ValueError):
            validate_port(70000)


class TestCsvUploadValidation:
    def test_valid_csv(self):
        validate_csv_upload("data.csv", 1024)

    def test_rejects_non_csv(self):
        with pytest.raises(ValueError):
            validate_csv_upload("data.exe", 1024)

    def test_rejects_too_large(self):
        with pytest.raises(ValueError):
            validate_csv_upload("data.csv", 60 * 1024 * 1024)

    def test_rejects_empty(self):
        with pytest.raises(ValueError):
            validate_csv_upload("data.csv", 0)
