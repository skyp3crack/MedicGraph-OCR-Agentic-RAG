"""
Pytest tests for Authentication, Authorization, and JWT Security.
"""

from app.utils.auth_utils import decode_jwt, encode_jwt, hash_password, verify_password


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
    """Test full signup → signin flow via API with secure password."""
    signup_payload = {
        "email": "newdoctor@medicograph.dev",
        "password": "Clinician_secure_pass_123",
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
        "password": "Clinician_secure_pass_123"
    }
    response = client.post("/api/auth/signin", json=signin_payload)
    assert response.status_code == 200
    data_signin = response.json()
    assert "access_token" in data_signin


def test_signin_wrong_password(client, test_db):
    """Verify wrong password returns 401."""
    # Create user first with valid password
    signup_resp = client.post("/api/auth/signup", json={
        "email": "doc@test.dev", "password": "Correct_pass123", "name": "Dr. Test"
    })
    assert signup_resp.status_code == 200
    response = client.post("/api/auth/signin", json={
        "email": "doc@test.dev", "password": "Wrong_password123"
    })
    assert response.status_code == 401


def test_signup_validation_errors(client, test_db):
    """Verify weak passwords and invalid emails are rejected with 422."""
    # Password too short
    response = client.post("/api/auth/signup", json={
        "email": "doc1@test.dev", "password": "Short1", "name": "Dr. Test"
    })
    assert response.status_code == 422

    # Password no uppercase
    response = client.post("/api/auth/signup", json={
        "email": "doc2@test.dev", "password": "nouppercase123", "name": "Dr. Test"
    })
    assert response.status_code == 422

    # Password no digit
    response = client.post("/api/auth/signup", json={
        "email": "doc3@test.dev", "password": "NoDigitPassword", "name": "Dr. Test"
    })
    assert response.status_code == 422

    # Invalid email format
    response = client.post("/api/auth/signup", json={
        "email": "invalidemail", "password": "ValidPassword123", "name": "Dr. Test"
    })
    assert response.status_code == 422


def test_token_refresh(auth_client):
    """Verify token refresh endpoint."""
    client, token, user = auth_client
    response = client.post("/api/auth/refresh")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == user["email"]


def test_protected_endpoint_without_token(client, test_db):
    """Verify unauthenticated access returns 401/403."""
    response = client.get("/api/audit/logs")
    assert response.status_code in (401, 403)


def test_protected_endpoint_with_token(auth_client):
    """Verify authenticated access returns audit logs."""
    client, token, user = auth_client
    response = client.get("/api/audit/logs")
    assert response.status_code == 200
    res = response.json()
    assert "total" in res
    assert "logs" in res
    assert isinstance(res["logs"], list)



def test_rbac_denies_non_clinician(client, test_db):
    """Verify that a user without clinician/admin role is denied access."""
    # Create user with role "patient" directly in DB
    from app.models.models import User
    from app.utils.auth_utils import encode_jwt, hash_password
    user = User(
        email="patient@test.dev",
        name="Patient Test",
        hashed_password=hash_password("PatientPass123"),
        role="patient",
    )
    test_db.add(user)
    test_db.commit()

    token = encode_jwt({"sub": user.email, "role": user.role})
    response = client.get("/api/audit/logs", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]

