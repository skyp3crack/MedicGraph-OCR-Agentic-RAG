"""
Pytest tests for Authentication, Authorization, and JWT Security.
"""

from app.utils.auth_utils import hash_password, verify_password, encode_jwt, decode_jwt


def test_password_hashing():
    """Verify bcrypt hashing produces valid, non-reversible hashes."""
    password = "SuperSecretPassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("WrongPassword", hashed)


def test_jwt_generation_and_decoding():
    """Verify JWT round-trip: encode → decode preserves claims."""
    payload = {"sub": "doctor@medicograph.dev", "role": "clinician"}
    token = encode_jwt(payload, expires_in_seconds=60)
    assert token is not None

    decoded = decode_jwt(token)
    assert decoded["sub"] == "doctor@medicograph.dev"
    assert decoded["role"] == "clinician"
    assert "exp" in decoded


def test_jwt_expired_token_rejected():
    """Verify expired JWT tokens raise ValueError."""
    import pytest
    token = encode_jwt({"sub": "test@test.dev"}, expires_in_seconds=-1)
    with pytest.raises(ValueError, match="expired"):
        decode_jwt(token)


def test_jwt_invalid_signature_rejected():
    """Verify tokens signed with wrong key are rejected."""
    import pytest
    token = encode_jwt({"sub": "test@test.dev"}, secret="wrong_secret")
    with pytest.raises(ValueError):
        decode_jwt(token)


def test_signup_and_signin(client, test_db):
    """Test full signup → signin flow via API."""
    signup_payload = {
        "email": "newdoctor@medicograph.dev",
        "password": "clinician_secure_pass_123",
        "name": "Dr. New Clinician"
    }
    response = client.post("/api/auth/signup", json=signup_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Signin with correct password
    signin_payload = {
        "email": "newdoctor@medicograph.dev",
        "password": "clinician_secure_pass_123"
    }
    response = client.post("/api/auth/signin", json=signin_payload)
    assert response.status_code == 200
    assert "access_token" in data


def test_signin_wrong_password(client, test_db):
    """Verify wrong password returns 401."""
    # Create user first
    client.post("/api/auth/signup", json={
        "email": "doc@test.dev", "password": "correct_pass", "name": "Dr. Test"
    })
    response = client.post("/api/auth/signin", json={
        "email": "doc@test.dev", "password": "wrong_password"
    })
    assert response.status_code == 401


def test_protected_endpoint_without_token(client, test_db):
    """Verify unauthenticated access returns 401/403."""
    response = client.get("/api/audit/logs")
    assert response.status_code in (401, 403)


def test_protected_endpoint_with_token(auth_client):
    """Verify authenticated access returns audit logs."""
    client, token, user = auth_client
    response = client.get("/api/audit/logs")
    assert response.status_code == 200
    logs = response.json()
    assert isinstance(logs, list)
