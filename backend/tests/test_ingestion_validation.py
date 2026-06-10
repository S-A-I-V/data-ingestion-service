"""
Tests for ingestion input validation.
Verifies that:
  - SQL injection attempts are blocked
  - File uploads are validated
  - Column mappings are validated
  - Operations are whitelisted
"""

import pytest

from app.services.validators import (
    sanitize_string,
    validate_csv_upload,
    validate_host,
    validate_identifier,
    validate_identifiers,
    validate_operation,
    validate_port,
)


class TestIdentifierValidation:
    def test_valid_identifiers(self):
        assert validate_identifier("users") == "users"
        assert validate_identifier("user_name") == "user_name"
        assert validate_identifier("public.users") == "public.users"
        assert validate_identifier("_private") == "_private"

    def test_invalid_identifiers(self):
        with pytest.raises(ValueError):
            validate_identifier("")
        with pytest.raises(ValueError):
            validate_identifier("a" * 200)
        with pytest.raises(ValueError):
            validate_identifier("123abc")
        with pytest.raises(ValueError):
            validate_identifier("user; DROP TABLE")
        with pytest.raises(ValueError):
            validate_identifier("col--name")

    def test_sql_injection_blocked(self):
        attacks = [
            "users; DROP TABLE users",
            "col UNION SELECT * FROM passwords",
            "name/* comment */",
            "xp_cmdshell",
        ]
        for attack in attacks:
            with pytest.raises(ValueError):
                validate_identifier(attack)

    def test_reserved_keywords_blocked(self):
        with pytest.raises(ValueError):
            validate_identifier("select")
        with pytest.raises(ValueError):
            validate_identifier("DROP")

    def test_validate_identifiers_empty_list(self):
        with pytest.raises(ValueError):
            validate_identifiers([])

    def test_validate_identifiers_too_many(self):
        with pytest.raises(ValueError):
            validate_identifiers(["col"] * 1001)


class TestOperationValidation:
    def test_valid_operations(self):
        assert validate_operation("INSERT") == "INSERT"
        assert validate_operation("insert") == "INSERT"
        assert validate_operation("INSERT_SKIP") == "INSERT_SKIP"
        assert validate_operation("UPSERT") == "UPSERT"

    def test_invalid_operations(self):
        with pytest.raises(ValueError):
            validate_operation("DELETE")
        with pytest.raises(ValueError):
            validate_operation("DROP")
        with pytest.raises(ValueError):
            validate_operation("")


class TestHostValidation:
    def test_valid_hosts(self):
        assert validate_host("localhost") == "localhost"
        assert validate_host("db.example.com") == "db.example.com"
        assert validate_host("192.168.1.1") == "192.168.1.1"
        assert validate_host("my-cluster.us-east-1.rds.amazonaws.com") == "my-cluster.us-east-1.rds.amazonaws.com"

    def test_invalid_hosts(self):
        with pytest.raises(ValueError):
            validate_host("")
        with pytest.raises(ValueError):
            validate_host("host:5432")
        with pytest.raises(ValueError):
            validate_host("host/database")
        with pytest.raises(ValueError):
            validate_host("host; rm -rf /")
        with pytest.raises(ValueError):
            validate_host("host' OR '1'='1")


class TestPortValidation:
    def test_valid_ports(self):
        assert validate_port(5432) == 5432
        assert validate_port(1) == 1
        assert validate_port(65535) == 65535

    def test_invalid_ports(self):
        with pytest.raises(ValueError):
            validate_port(0)
        with pytest.raises(ValueError):
            validate_port(65536)
        with pytest.raises(ValueError):
            validate_port(-1)


class TestCsvUploadValidation:
    def test_valid_csv(self):
        validate_csv_upload("data.csv", 1024)

    def test_empty_filename(self):
        with pytest.raises(ValueError):
            validate_csv_upload("", 1024)

    def test_wrong_extension(self):
        with pytest.raises(ValueError):
            validate_csv_upload("data.xlsx", 1024)
        with pytest.raises(ValueError):
            validate_csv_upload("script.sh", 1024)

    def test_too_large(self):
        with pytest.raises(ValueError):
            validate_csv_upload("data.csv", 100 * 1024 * 1024)

    def test_empty_file(self):
        with pytest.raises(ValueError):
            validate_csv_upload("data.csv", 0)

    def test_path_traversal(self):
        with pytest.raises(ValueError):
            validate_csv_upload("../../../etc/passwd.csv", 1024)
        with pytest.raises(ValueError):
            validate_csv_upload("subdir/data.csv", 1024)


class TestSanitizeString:
    def test_normal_string(self):
        assert sanitize_string("hello world") == "hello world"

    def test_strips_whitespace(self):
        assert sanitize_string("  hello  ") == "hello"

    def test_truncates(self):
        assert sanitize_string("x" * 300, max_length=10) == "x" * 10

    def test_removes_control_chars(self):
        assert sanitize_string("hello\x00world") == "helloworld"

    def test_empty_input(self):
        assert sanitize_string("") == ""
        assert sanitize_string(None) == ""
