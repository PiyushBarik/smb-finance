"""
Phase 3 report endpoints:
  GET  /api/reports/excel/{org_id}   — download formatted Excel workbook
  POST /api/reports/email/{org_id}   — send P&L email with Excel attachment
  GET  /api/reports/insights/{org_id} — get LLM insights separately (for UI)
"""
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, check_org_membership
from app.models.transaction import Transaction, UploadBatch
from app.models.organization import Organization
from app.models.user import User
from app.schemas.transactions import CategoryTotal, GSTLine
from app.services.excel_export import generate_excel
from app.services.email_report import build_email_html, send_report_email
from app.services.llm_insights import generate_llm_insights
from app.services.audit import log_action
from app.services.billing import require_feature

router = APIRouter(prefix="/reports", tags=["reports"])


class EmailReportRequest(BaseModel):
    to_email: EmailStr
    attach_excel: bool = True


def _build_summary(org_id: int, db: Session, date_from=None, date_to=None):
    """Shared helper — returns all data needed by both Excel + email."""
    q = db.query(Transaction).filter(Transaction.org_id == org_id)
    if date_from:
        q = q.filter(Transaction.date >= date_from)
    if date_to:
        q = q.filter(Transaction.date <= date_to)
    txns = q.all()

    total_income   = sum(t.amount for t in txns if t.amount > 0)
    total_expenses = sum(t.amount for t in txns if t.amount < 0)
    net_cashflow   = total_income + total_expenses

    # Category totals
    cat_map: dict = {}
    for t in txns:
        cat = t.category or "Uncategorised"
        if cat not in cat_map:
            cat_map[cat] = {"total": 0.0, "count": 0}
        cat_map[cat]["total"] += t.amount
        cat_map[cat]["count"] += 1

    expense_total = abs(total_expenses) or 1
    category_totals = []
    for k, v in sorted(cat_map.items(), key=lambda x: x[1]["total"]):
        pct = abs(v["total"]) / expense_total * 100 if v["total"] < 0 else 0
        category_totals.append(CategoryTotal(
            category=k, total=round(v["total"], 2),
            count=v["count"], percentage=round(pct, 1),
        ))

    # GST lines
    gst_txns = [t for t in txns if t.gst_amount and t.amount < 0]
    gst_map: dict = {}
    for t in gst_txns:
        cat = t.category or "Uncategorised"
        if cat not in gst_map:
            gst_map[cat] = {"taxable": 0.0, "gst": 0.0}
        gst = t.gst_amount or 0
        gst_map[cat]["taxable"] += abs(t.amount) - gst
        gst_map[cat]["gst"]     += gst
    gst_lines = [
        GSTLine(
            category=cat,
            taxable_amount=round(v["taxable"], 2),
            gst_amount=round(v["gst"], 2),
            cgst=round(v["gst"] / 2, 2),
            sgst=round(v["gst"] / 2, 2),
            igst=0.0,
        )
        for cat, v in gst_map.items()
    ]

    # Period label
    if date_from and date_to:
        period_label = f"{date_from.strftime('%d %b %Y')} – {date_to.strftime('%d %b %Y')}"
    else:
        period_label = "All time"

    return {
        "txns": txns,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_cashflow": net_cashflow,
        "category_totals": category_totals,
        "gst_lines": gst_lines,
        "period_label": period_label,
    }


# ── Excel export ──────────────────────────────────────────────────────────────

@router.get("/excel/{org_id}")
def export_excel(
    org_id: int,
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_org_membership(org_id, current_user, db)
    require_feature("excel_export", current_user, db)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    d = _build_summary(org_id, db, date_from, date_to)

    xlsx_bytes = generate_excel(
        org_name=org.name,
        period_label=d["period_label"],
        total_income=d["total_income"],
        total_expenses=d["total_expenses"],
        net_cashflow=d["net_cashflow"],
        category_totals=d["category_totals"],
        transactions=d["txns"],
        gst_lines=d["gst_lines"],
    )

    log_action(db, "report.excel_export", user_id=current_user.id, org_id=org_id,
               detail={"period": d["period_label"]})
    db.commit()

    filename = f"claritybooks_{org.slug}_{d['period_label'].replace(' ', '_')}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Email report ──────────────────────────────────────────────────────────────

@router.post("/email/{org_id}")
def email_report(
    org_id: int,
    payload: EmailReportRequest,
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = check_org_membership(org_id, current_user, db)
    if m.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can send reports")
    require_feature("email_reports", current_user, db)

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    d = _build_summary(org_id, db, date_from, date_to)

    insights = generate_llm_insights(
        category_totals={c.category: c.total for c in d["category_totals"]},
        total_income=d["total_income"],
        total_expenses=d["total_expenses"],
        net_cashflow=d["net_cashflow"],
        period_label=d["period_label"],
        org_name=org.name,
        transaction_count=len(d["txns"]),
    )

    html = build_email_html(
        org_name=org.name,
        period_label=d["period_label"],
        total_income=d["total_income"],
        total_expenses=d["total_expenses"],
        net_cashflow=d["net_cashflow"],
        category_totals=d["category_totals"],
        insights=insights,
    )

    attachment = None
    if payload.attach_excel:
        attachment = generate_excel(
            org_name=org.name,
            period_label=d["period_label"],
            total_income=d["total_income"],
            total_expenses=d["total_expenses"],
            net_cashflow=d["net_cashflow"],
            category_totals=d["category_totals"],
            transactions=d["txns"],
            gst_lines=d["gst_lines"],
        )

    result = send_report_email(
        to_email=payload.to_email,
        org_name=org.name,
        period_label=d["period_label"],
        html_body=html,
        attachment_bytes=attachment,
        attachment_name=f"claritybooks_{org.slug}.xlsx",
    )

    log_action(db, "report.email_sent", user_id=current_user.id, org_id=org_id,
               detail={"to": payload.to_email, "sent": result["sent"],
                       "error": result.get("error")})
    db.commit()

    if not result["sent"]:
        raise HTTPException(
            status_code=503,
            detail=f"Email not sent: {result.get('error')}. Configure SMTP_HOST in .env to enable email."
        )
    return {"sent": True, "to": payload.to_email}


# ── LLM Insights ─────────────────────────────────────────────────────────────

@router.get("/insights/{org_id}")
def get_insights(
    org_id: int,
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Standalone insights endpoint — called by the dashboard's 'Refresh Insights' button.
    Returns LLM insights (or rules fallback) for the current period.
    """
    check_org_membership(org_id, current_user, db)
    org = db.query(Organization).filter(Organization.id == org_id).first()
    d = _build_summary(org_id, db, date_from, date_to)

    insights = generate_llm_insights(
        category_totals={c.category: c.total for c in d["category_totals"]},
        total_income=d["total_income"],
        total_expenses=d["total_expenses"],
        net_cashflow=d["net_cashflow"],
        period_label=d["period_label"],
        org_name=org.name if org else "",
        transaction_count=len(d["txns"]),
    )
    llm_used = bool(
        __import__("app.core.config", fromlist=["settings"]).settings.ANTHROPIC_API_KEY
    )
    return {"insights": insights, "llm_used": llm_used, "period_label": d["period_label"]}
