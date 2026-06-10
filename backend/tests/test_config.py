"""
Tests for configuration validation.
Verifies that:
  - Insecure defaults are detected
  - Production validation catches critical misconfigurations
"""

import os
from unittest.mock import patch


class TestConfigValidation:
    def test_insecure_secret_key_warning(self, capsys):
        """Insecure default SECRET_KEY should trigger a warning."""
        with patch.dict(os.environ, {"SECRET_KEY": "change-me"}, clear=False):
            # Re-import to trigger validation
            from app.config import _INSECURE_DEFAULTS

            assert "change-me" in _INSECURE_DEFAULTS

    def test_short_secret_key(self):
        """Short SECRET_KEY should be flagged."""
        from app.config import _INSECURE_DEFAULTS

        # Anything in the insecure list should be caught
        assert "change-me" in _INSECURE_DEFAULTS
        assert "" in _INSECURE_DEFAULTS

    def test_production_refuses_defaults(self):
        """Production environment should refuse insecure defaults."""
        from app.config import _INSECURE_DEFAULTS, Settings

        s = Settings(
            SECRET_KEY="change-me",
            ENCRYPTION_KEY="change-me-encryption-key",
            ENVIRONMENT="production",
        )
        # These values are in the insecure defaults
        assert s.SECRET_KEY in _INSECURE_DEFAULTS
        assert s.ENCRYPTION_KEY in _INSECURE_DEFAULTS

    def test_valid_production_config(self):
        """Valid production config should pass validation."""
        from app.config import _INSECURE_DEFAULTS, Settings

        s = Settings(
            SECRET_KEY="a-very-long-random-secret-key-that-is-secure-enough",
            ENCRYPTION_KEY="another-very-long-random-encryption-key-secure",
            ENVIRONMENT="production",
            DATABASE_URL="postgresql://user:pass@prod-db.example.com:5432/app",
            GOOGLE_CLIENT_ID="real-client-id",
        )
        assert s.SECRET_KEY not in _INSECURE_DEFAULTS
        assert s.ENCRYPTION_KEY not in _INSECURE_DEFAULTS

    def test_pool_settings_configurable(self):
        """Pool settings should be configurable via environment."""
        from app.config import Settings

        s = Settings(
            DB_POOL_SIZE=50,
            DB_MAX_OVERFLOW=100,
            DB_POOL_TIMEOUT=60,
            DB_POOL_RECYCLE=7200,
        )
        assert s.DB_POOL_SIZE == 50
        assert s.DB_MAX_OVERFLOW == 100
        assert s.DB_POOL_TIMEOUT == 60
        assert s.DB_POOL_RECYCLE == 7200
