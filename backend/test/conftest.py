"""
Pytest fixtures for MedicGraph backend tests.

Provides:
- test_db: Isolated in-memory SQLite database session
- client: FastAPI TestClient with clean DB per test
- auth_client: Pre-authenticated TestClient with JWT token
"""

import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure backend root is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set mock env BEFORE importing app modules
os.environ.setdefault("GEMINI_API_KEY", "test_mock_key")

from app.database import Base, get_db
from app.models.models import User
from app.utils.auth_utils import encode_jwt, hash_password
from main import app


@pytest.fixture
def test_db():
    """Create an isolated in-memory SQLite DB for each test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestingSessionLocal()
    yield db
    db.close()

    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client(test_db):
    """FastAPI TestClient wired to the in-memory test DB."""
    return TestClient(app)


@pytest.fixture
def auth_client(test_db, client):
    """
    Pre-authenticated TestClient.
    Creates a test user and returns (client, token, user_dict).
    """
    # Seed a test user directly into the DB
    user = User(
        email="testdoctor@medicograph.dev",
        name="Dr. Test",
        hashed_password=hash_password("TestPassword123"),
        role="clinician",
    )
    test_db.add(user)
    test_db.commit()

    # Generate a valid JWT
    token = encode_jwt({"sub": user.email, "role": user.role})
    client.headers.update({"Authorization": f"Bearer {token}"})

    return client, token, {"email": user.email, "name": user.name, "role": user.role}
