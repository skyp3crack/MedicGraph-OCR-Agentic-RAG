import base64
import json
import hmac
import hashlib
import time
import bcrypt
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User

logger = logging.getLogger(__name__)

SECRET_KEY = "medicograph_super_secret_key_123"  # Standard local fallback
ALGORITHM = "HS256"

security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def base64url_encode(data: bytes) -> str:
    """Url-safe base64 encode without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    """Url-safe base64 decode with correct padding reconstruction."""
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)

def encode_jwt(payload: dict, secret: str = SECRET_KEY, expires_in_seconds: int = 86400) -> str:
    """Generate a standard HS256 JWT token."""
    header = {"alg": ALGORITHM, "typ": "JWT"}
    
    # Inject expiration
    if "exp" not in payload:
        payload["exp"] = int(time.time()) + expires_in_seconds
        
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload).encode('utf-8'))
    message = f"{header_b64}.{payload_b64}".encode('utf-8')
    
    signature = hmac.new(secret.encode('utf-8'), message, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_jwt(token: str, secret: str = SECRET_KEY) -> dict:
    """Decode and verify a standard HS256 JWT token."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid token format")
            
        header_b64, payload_b64, signature_b64 = parts
        message = f"{header_b64}.{payload_b64}".encode('utf-8')
        
        expected_signature = hmac.new(secret.encode('utf-8'), message, hashlib.sha256).digest()
        if not hmac.compare_digest(base64url_decode(signature_b64), expected_signature):
            raise ValueError("Signature verification failed")
            
        payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
        if "exp" in payload and payload["exp"] < time.time():
            raise ValueError("Token expired")
            
        return payload
    except Exception as e:
        raise ValueError(f"Invalid token: {e}")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """FastAPI security dependency to get the currently authenticated clinician."""
    token = credentials.credentials
    try:
        payload = decode_jwt(token)
        email = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing sub claim"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user
