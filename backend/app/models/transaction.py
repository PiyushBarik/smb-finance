from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship

from app.models.base import Base


class UploadBatch(Base):
    __tablename__ = "upload_batches"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    source = Column(String, default="manual")   # shopify | bank | manual
    row_count = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    org = relationship("Organization", back_populates="upload_batches")
    transactions = relationship("Transaction", back_populates="batch")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("upload_batches.id"), nullable=False)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)

    date = Column(Date, nullable=True)
    description = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    category = Column(String, nullable=True)          # categorisation result
    gst_amount = Column(Float, nullable=True)
    is_reconciled = Column(Boolean, default=False)
    reconciled_with = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    raw_row = Column(Text, nullable=True)              # JSON string of original CSV row

    batch = relationship("UploadBatch", back_populates="transactions")
