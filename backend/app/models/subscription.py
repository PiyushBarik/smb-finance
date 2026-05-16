from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from app.models.base import Base


class Plan(Base):
    """Static plan definitions — seeded at startup."""
    __tablename__ = "plans"

    id              = Column(Integer, primary_key=True)
    name            = Column(String, unique=True, nullable=False)   # free | starter | pro | business
    display_name    = Column(String, nullable=False)
    price_monthly   = Column(Float, default=0)                      # INR
    price_yearly    = Column(Float, default=0)
    stripe_price_id = Column(String, nullable=True)                 # price_xxx from Stripe
    max_orgs        = Column(Integer, default=1)
    max_txns_month  = Column(Integer, default=500)                  # -1 = unlimited
    max_team_members= Column(Integer, default=1)
    ai_insights     = Column(Boolean, default=False)
    excel_export    = Column(Boolean, default=False)
    email_reports   = Column(Boolean, default=False)
    api_access      = Column(Boolean, default=False)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id             = Column(Integer, ForeignKey("plans.id"),  nullable=False)
    stripe_customer_id  = Column(String, nullable=True)
    stripe_sub_id       = Column(String, nullable=True)
    status              = Column(String, default="active")          # active | cancelled | past_due | trialing
    billing_cycle       = Column(String, default="monthly")         # monthly | yearly
    current_period_end  = Column(DateTime, nullable=True)
    cancel_at_period_end= Column(Boolean, default=False)
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    plan = relationship("Plan")
