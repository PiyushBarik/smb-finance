from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.models.base import Base


class Invite(Base):
    __tablename__ = "invites"

    id          = Column(Integer, primary_key=True, index=True)
    org_id      = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    invited_by  = Column(Integer, ForeignKey("users.id"),         nullable=False)
    email       = Column(String, nullable=False)
    role        = Column(String, default="viewer")          # owner | admin | viewer
    token       = Column(String, unique=True, nullable=False, index=True)
    accepted    = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    expires_at  = Column(DateTime, nullable=False)

    org         = relationship("Organization")
    inviter     = relationship("User", foreign_keys=[invited_by])
