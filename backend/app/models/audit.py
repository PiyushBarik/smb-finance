from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from app.models.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    org_id      = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    user_id     = Column(Integer, ForeignKey("users.id"),         nullable=True)
    action      = Column(String, nullable=False)   # e.g. "upload.csv" "reconcile.run"
    resource    = Column(String, nullable=True)    # e.g. "batch:42" "transaction:7"
    detail      = Column(Text,   nullable=True)    # JSON extra context
    ip_address  = Column(String, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
