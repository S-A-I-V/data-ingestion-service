"""
Tests for audit log hash chain integrity.
Verifies that:
  - Hash computation is deterministic
  - Chain links are correct (prev_hash references previous record_hash)
  - Seal sets both hash fields
"""

from app.models.audit import AuditLog


def _make_audit(**kwargs) -> AuditLog:
    defaults = {
        "user_id": "test-user-1",
        "user_email": "test@example.com",
        "connection_id": 1,
        "connection_name": "Test DB",
        "operation": "INSERT",
        "table_name": "users",
        "row_count": 100,
        "query_preview": "INSERT INTO users ...",
        "status": "success",
        "error_message": None,
    }
    defaults.update(kwargs)
    return AuditLog(**defaults)


class TestAuditHashChain:
    def test_compute_hash_deterministic(self):
        """Same content should always produce same hash."""
        a = _make_audit()
        a.prev_hash = "GENESIS"
        h1 = a.compute_hash()
        h2 = a.compute_hash()
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex

    def test_compute_hash_different_content(self):
        """Different content should produce different hashes."""
        a = _make_audit(row_count=100)
        b = _make_audit(row_count=200)
        a.prev_hash = ""
        b.prev_hash = ""
        assert a.compute_hash() != b.compute_hash()

    def test_seal_sets_both_fields(self):
        """seal() should set prev_hash and record_hash."""
        a = _make_audit()
        a.seal(prev_hash="abc123")
        assert a.prev_hash == "abc123"
        assert a.record_hash is not None
        assert len(a.record_hash) == 64

    def test_seal_genesis(self):
        """First record (no prev_hash) should use empty string."""
        a = _make_audit()
        a.seal(prev_hash=None)
        assert a.prev_hash == ""
        assert a.record_hash is not None

    def test_chain_integrity(self):
        """A chain of records should link correctly."""
        records = []
        prev = None
        for i in range(5):
            audit = _make_audit(row_count=i * 10)
            audit.seal(prev_hash=prev)
            records.append(audit)
            prev = audit.record_hash

        # Verify chain
        for i in range(1, len(records)):
            assert records[i].prev_hash == records[i - 1].record_hash

    def test_tamper_detection(self):
        """Modifying a record should break the hash."""
        a = _make_audit()
        a.seal(prev_hash=None)
        original_hash = a.record_hash

        # Tamper with the record
        a.row_count = 999
        recomputed = a.compute_hash()
        assert recomputed != original_hash
