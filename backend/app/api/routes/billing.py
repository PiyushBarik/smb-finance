"""
Phase 4: Billing routes.
  GET  /api/billing/plans              — list all plans with features
  GET  /api/billing/subscription       — current user's plan
  POST /api/billing/checkout           — create Stripe Checkout session
  POST /api/billing/webhook            — Stripe webhook (no auth)
  POST /api/billing/cancel             — cancel subscription
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.subscription import Plan, Subscription
from app.models.user import User
from app.services.billing import (
    get_user_plan, ensure_free_plan,
    create_checkout_session, handle_webhook,
)

router = APIRouter(prefix="/billing", tags=["billing"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class PlanOut(BaseModel):
    id:                int
    name:              str
    display_name:      str
    price_monthly:     float
    price_yearly:      float
    max_orgs:          int
    max_txns_month:    int
    max_team_members:  int
    ai_insights:       bool
    excel_export:      bool
    email_reports:     bool
    api_access:        bool

    class Config:
        from_attributes = True


class SubscriptionOut(BaseModel):
    plan:               PlanOut
    status:             str
    billing_cycle:      str
    cancel_at_period_end: bool
    current_period_end: Optional[str] = None

    class Config:
        from_attributes = True


class CheckoutRequest(BaseModel):
    plan_name:     str
    billing_cycle: str = "monthly"   # monthly | yearly


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/plans", response_model=List[PlanOut])
def list_plans(db: Session = Depends(get_db)):
    """Public endpoint — no auth needed."""
    return db.query(Plan).order_by(Plan.price_monthly).all()


@router.get("/subscription", response_model=SubscriptionOut)
def get_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_free_plan(current_user.id, db)
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id)
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")

    plan_out = PlanOut.model_validate(sub.plan)
    return SubscriptionOut(
        plan=plan_out,
        status=sub.status,
        billing_cycle=sub.billing_cycle,
        cancel_at_period_end=sub.cancel_at_period_end,
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
    )


@router.post("/checkout")
def checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = create_checkout_session(
        user=current_user,
        plan_name=payload.plan_name,
        billing_cycle=payload.billing_cycle,
        db=db,
    )
    return result


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe sends events here. No JWT auth — uses Stripe signature instead."""
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    return handle_webhook(payload, sig_header, db)


@router.post("/cancel")
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.core.config import settings
    sub = (
        db.query(Subscription)
        .filter(Subscription.user_id == current_user.id, Subscription.status == "active")
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription to cancel")
    if not sub.stripe_sub_id:
        raise HTTPException(status_code=400, detail="No Stripe subscription linked")

    if not settings.STRIPE_SECRET_KEY:
        # Demo mode — just mark as cancelled
        free_plan = db.query(Plan).filter(Plan.name == "free").first()
        if free_plan:
            sub.plan_id = free_plan.id
        sub.status = "cancelled"
        db.commit()
        return {"message": "Subscription cancelled (demo mode)"}

    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    stripe.Subscription.modify(sub.stripe_sub_id, cancel_at_period_end=True)
    sub.cancel_at_period_end = True
    db.commit()
    return {"message": "Subscription will cancel at end of billing period"}
