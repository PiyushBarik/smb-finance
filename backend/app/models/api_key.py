from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from app.models.base import Base


class APIKey(Base):
    __tablename__ = "api_keys"

    id          = Column(Integer, primary_key=True, index=True)
    org_id      = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    created_by  = Column(Integer, ForeignKey("users.id"),         nullable=False)
    name        = Column(String, nullable=False)          # "Shopify Webhook Key"
    key_prefix  = Column(String, nullable=False)          # "cb_live_xxxx" first 12 chars shown
    key_hash    = Column(String, nullable=False, unique=True)  # bcrypt hash of full key
    is_active   = Column(Boolean, default=True)
    last_used   = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    expires_at  = Column(DateTime, nullable=True)
