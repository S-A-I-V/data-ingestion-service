"""Tests for authentication helper functions."""

import hashlib
import secrets

import pytest
from fastapi import HTTPException

from app.services.auth_helpers import hash_password, validate_password, verify_password


class TestPasswordHashing:
    def test_hash_and_verify(self):
        pw = "TestPass123!"
        hashed = hash_password(pw)
        assert verify_password(pw, hashed)

    def test_wrong_password_fails(self):
        hashed = hash_password("TestPass123!")
        assert not verify_password("WrongPass123!", hashed)

    def test_legacy_pbkdf2_migration(self):
        """Legacy format: salt:hash — should still verify."""
        pw = "LegacyPass1!"
        salt = secrets.token_hex(16)
        legacy_hash = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100000).hex()
        legacy = f"{salt}:{legacy_hash}"
        assert verify_password(pw, legacy)


class TestPasswordValidation:
    def test_valid_password(self):
        validate_password("StrongP@ss1")

    def test_too_short(self):
        with pytest.raises(HTTPException):
            validate_password("Sh0rt!")

    def test_no_uppercase(self):
        with pytest.raises(HTTPException):
            validate_password("lowercase1!")

    def test_no_digit(self):
        with pytest.raises(HTTPException):
            validate_password("NoDigits!!")

    def test_no_special(self):
        with pytest.raises(HTTPException):
            validate_password("NoSpecial1A")
