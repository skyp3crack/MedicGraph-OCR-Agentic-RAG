import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, func
from app.database import Base

class User(Base):
    """Database model representing a registered clinician/user."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="clinician", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    """Database model for tracking clinician actions without exposing PHI."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(String, index=True, nullable=False)
    clinician_email = Column(String, nullable=False)
    action = Column(String, nullable=False)  # approve, reject, escalate
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    # Stores metadata of changes (e.g. fields modified, count of diagnoses)
    # This must NEVER contain raw patient text, IC number, or name to prevent PHI leaks.
    payload = Column(Text, nullable=True) 
