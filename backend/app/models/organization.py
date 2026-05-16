from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base


class MemberRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    viewer = "viewer"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    gst_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("OrganizationMember", back_populates="org")
    upload_batches = relationship("UploadBatch", back_populates="org")


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, default=MemberRole.owner)
    joined_at = Column(DateTime, default=datetime.utcnow)

    org = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="memberships")
