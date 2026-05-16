"""
Billing service — plan enforcement and Stripe Checkout.

Plans (INR/month):
    free      ₹0    — 1 org, 500 txns/month, no AI/Excel/email
    starter   ₹499  — 2 orgs, 5000 txns, AI insights
    pro       ₹999  — 5 orgs, 25000 txns, AI+Excel+email
    business  ₹2499 — unlimited orgs, unlimited txns, all features + API

Stripe integration is optional — if STRIPE_SECRET_KEY is not set, all plans
are available in "demo mode" and upgrade/checkout is gracefully skipped.
"""
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.subscription import Subscription, Plan
from app.models.user import User
from app.core.config import settings

# ── Plan definitions (seeded on startup) ─────────────────────────────────────

PLAN_DEFAULTS = [
    dict(name="free", display_name="Free", price_monthly=0, price_yearly=0,
         max_orgs=1, max_txns_month=500, max_team_members=1,
         ai_insights=False, excel_export=False, email_reports=False, api_access=False),

    dict(name="starter", display_name="Starter", price_monthly=499, price_yearly=4990,
         max_orgs=2, max_txns_month=5_000, max_team_members=3,
         ai_insights=True, excel_export=False, email_reports=False, api_access=False),

    dict(name="pro", display_name="Pro", price_monthly=999, price_yearly=9990,
         max_orgs=5, max_txns_month=25_000, max_team_members=10,
         ai_insights=True, excel_export=True, email_reports=True, api_access=False),

    dict(name="business", display_name="Business", price_monthly=2499, price_yearly=24990,
         max_orgs=-1, max_txns_month=-1, max_team_members=-1,
         ai_insights=True, excel_export=True, email_reports=True, api_access=True),
]


def seed_plans(db: Session):
    """Called once at app startup — idempotent."""
    for p in PLAN_DEFAULTS:
        existing = db.query(Plan).filter(Plan.name == p["name"]).first()
        if not existing:
            db.add(Plan(**p))
    db.commit()


# ── Subscription helpers ──────────────────────────────────────────────────────

def get_active_subscription(user_id: int, db: Session) -> Optional[Subscription]:
    return (
        db.query(Subscription)
        .filter(Subscription.user_id == user_id, Subscription.status.in_(["active", "trialing"]))
        .first()
    )


def get_user_plan(user_id: int, db: Session) -> Plan:
    sub = get_active_subscription(user_id, db)
    if sub:
        return sub.plan
    # Default to free plan
    return db.query(Plan).filter(Plan.name == "free").first()


def ensure_free_plan(user_id: int, db: Session):
    """Create a free subscription for new users if none exists."""
    existing = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if existing:
        return
    free_plan = db.query(Plan).filter(Plan.name == "free").first()
    if free_plan:
        db.add(Subscription(user_id=user_id, plan_id=free_plan.id, status="active"))
        db.commit()


# ── Feature gates ─────────────────────────────────────────────────────────────

def require_feature(feature: str, user: User, db: Session):
    """
    Raise 403 if the user's plan doesn't include the feature.
    Features: ai_insights | excel_export | email_reports | api_access
    """
    plan = get_user_plan(user.id, db)
    if not getattr(plan, feature, False):
        raise HTTPException(
            status_code=403,
            detail=f"Your {plan.display_name} plan doesn't include {feature.replace('_', ' ')}. Upgrade to unlock.",
        )


def check_org_limit(user: User, db: Session):
    from app.models.organization import OrganizationMember
    plan = get_user_plan(user.id, db)
    if plan.max_orgs == -1:
        return  # unlimited
    owned = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id, OrganizationMember.role == "owner")
        .count()
    )
    if owned >= plan.max_orgs:
        raise HTTPException(
            status_code=403,
            detail=f"Your {plan.display_name} plan allows {plan.max_orgs} organisation(s). Upgrade to create more.",
        )


def check_txn_limit(org_id: int, user: User, db: Session):
    """Check monthly transaction upload limit."""
    from app.models.transaction import Transaction
    from datetime import date, timedelta
    plan = get_user_plan(user.id, db)
    if plan.max_txns_month == -1:
        return  # unlimited

    # Count txns uploaded this calendar month
    today = date.today()
    month_start = today.replace(day=1)
    count = (
        db.query(Transaction)
        .filter(Transaction.org_id == org_id)
        .filter(Transaction.date >= month_start)
        .count()
    )
    if count >= plan.max_txns_month:
        raise HTTPException(
            status_code=403,
            detail=f"Monthly limit of {plan.max_txns_month:,} transactions reached on your {plan.display_name} plan. Upgrade for more.",
        )


# ── Stripe Checkout ───────────────────────────────────────────────────────────

def create_checkout_session(
    user: User,
    plan_name: str,
    billing_cycle: str,
    db: Session,
    success_url: str = "http://localhost:3000/billing?success=1",
    cancel_url:  str = "http://localhost:3000/billing?cancelled=1",
) -> dict:
    if not settings.STRIPE_SECRET_KEY:
        # Demo mode — actually apply the plan upgrade so owners can test premium features locally
        plan = db.query(Plan).filter(Plan.name == plan_name).first()
        if plan:
            existing_sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
            if existing_sub:
                existing_sub.plan_id = plan.id
                existing_sub.status = "active"
                existing_sub.billing_cycle = billing_cycle
            else:
                db.add(Subscription(
                    user_id=user.id, plan_id=plan.id,
                    status="active", billing_cycle=billing_cycle,
                ))
            db.commit()
        return {
            "url": None,
            "demo": True,
            "message": f"Demo mode — upgraded to {plan_name} plan locally. Add STRIPE_SECRET_KEY to .env for real payments.",
        }

    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY

    plan = db.query(Plan).filter(Plan.name == plan_name).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if not plan.stripe_price_id:
        raise HTTPException(status_code=400, detail="This plan has no Stripe price configured")

    # Get or create Stripe customer
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    customer_id = sub.stripe_customer_id if sub else None

    if not customer_id:
        customer = stripe.Customer.create(email=user.email, name=user.name)
        customer_id = customer.id

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": plan.stripe_price_id, "quantity": 1}],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": str(user.id), "plan_name": plan_name, "billing_cycle": billing_cycle},
        subscription_data={"metadata": {"user_id": str(user.id)}},
    )

    return {"url": session.url, "demo": False}


def handle_webhook(payload: bytes, sig_header: str, db: Session) -> dict:
    """Process Stripe webhook events."""
    if not settings.STRIPE_SECRET_KEY:
        return {"status": "stripe_not_configured"}

    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id   = int(session["metadata"]["user_id"])
        plan_name = session["metadata"]["plan_name"]
        billing   = session["metadata"].get("billing_cycle", "monthly")
        sub_id    = session.get("subscription")

        plan = db.query(Plan).filter(Plan.name == plan_name).first()
        if plan:
            existing_sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
            if existing_sub:
                existing_sub.plan_id = plan.id
                existing_sub.stripe_sub_id = sub_id
                existing_sub.stripe_customer_id = session["customer"]
                existing_sub.status = "active"
                existing_sub.billing_cycle = billing
            else:
                db.add(Subscription(
                    user_id=user_id, plan_id=plan.id,
                    stripe_customer_id=session["customer"],
                    stripe_sub_id=sub_id, status="active", billing_cycle=billing,
                ))
            db.commit()

    elif event["type"] == "customer.subscription.deleted":
        sub_id = event["data"]["object"]["id"]
        sub = db.query(Subscription).filter(Subscription.stripe_sub_id == sub_id).first()
        if sub:
            # Downgrade to free
            free = db.query(Plan).filter(Plan.name == "free").first()
            if free:
                sub.plan_id = free.id
            sub.status = "cancelled"
            db.commit()

    elif event["type"] == "invoice.payment_failed":
        sub_id = event["data"]["object"].get("subscription")
        if sub_id:
            sub = db.query(Subscription).filter(Subscription.stripe_sub_id == sub_id).first()
            if sub:
                sub.status = "past_due"
                db.commit()

    return {"status": "processed", "event": event["type"]}
