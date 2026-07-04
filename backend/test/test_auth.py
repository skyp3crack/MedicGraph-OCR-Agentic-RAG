"""
Unit and integration tests for Phase 4: Authentication, Authorization, and JWT Security.
"""

import os
import sys
import json
from fastapi.testclient import TestClient

# Adjust path to find the 'app' module in parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set mock environment variables before importing app
os.environ["GEMINI_API_KEY"] = "mock_key"

from main import app
from app.utils.auth_utils import hash_password, verify_password, encode_jwt, decode_jwt
from app.database import engine, Base

client = TestClient(app)

def test_password_hashing():
    print("Testing password hashing...")
    password = "SuperSecretPassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("WrongPassword", hashed)
    print("  Password hashing: SUCCESS")

def test_jwt_generation_and_decoding():
    print("Testing JWT encoding/decoding...")
    payload = {"sub": "doctor@medicograph.dev", "role": "clinician"}
    token = encode_jwt(payload, expires_in_seconds=60)
    assert token is not None
    
    decoded = decode_jwt(token)
    assert decoded["sub"] == "doctor@medicograph.dev"
    assert decoded["role"] == "clinician"
    assert "exp" in decoded
    print("  JWT tokens: SUCCESS")

def test_api_auth_endpoints():
    print("Testing API Auth routes...")
    
    # 1. Test signup
    signup_payload = {
        "email": "test_clinician@medicograph.dev",
        "password": "clinician_secure_pass_123",
        "name": "Dr. Test Clinician"
    }
    
    response = client.post("/api/auth/signup", json=signup_payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == signup_payload["email"]
    
    token = data["access_token"]
    
    # 2. Test signin with correct password
    signin_payload = {
        "email": "test_clinician@medicograph.dev",
        "password": "clinician_secure_pass_123"
    }
    response = client.post("/api/auth/signin", json=signin_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    
    # 3. Test signin with wrong password
    bad_signin_payload = {
        "email": "test_clinician@medicograph.dev",
        "password": "wrong_password"
    }
    response = client.post("/api/auth/signin", json=bad_signin_payload)
    assert response.status_code == 401
    
    # 4. Test secure endpoint access (Unauthorized)
    response = client.get("/api/audit/logs")
    assert response.status_code == 401, f"Expected 401 (Unauthorized/Missing Header), got {response.status_code}"
    
    # 5. Test secure endpoint access (Authorized)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/audit/logs", headers=headers)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    logs = response.json()
    assert isinstance(logs, list)
    print("  API Auth Endpoints: SUCCESS")

if __name__ == "__main__":
    # Create clean test DB tables by dropping existing ones first
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    try:
        test_password_hashing()
        test_jwt_generation_and_decoding()
        test_api_auth_endpoints()
        print("\nAll Auth and JWT tests passed successfully!")
    except AssertionError as e:
        print(f"\nAssertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
