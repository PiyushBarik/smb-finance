"""
Plain-English CFO insights — India-focused.
Phase 3: replace with LLM-generated narrative.
"""
from typing import List, Dict


def generate_insights(
    category_totals: Dict[str, float],
    total_income: float,
    total_expenses: float,
    net_cashflow: float,
    period_label: str = "this period",
) -> List[str]:
    insights: List[str] = []

    # 1. Cashflow health
    if net_cashflow > 0:
        margin = (net_cashflow / total_income * 100) if total_income else 0
        insights.append(
            f"✅ You're cashflow positive {period_label} with a ₹{net_cashflow:,.0f} surplus "
            f"({margin:.1f}% net margin)."
        )
    elif net_cashflow < 0:
        insights.append(
            f"⚠️ Cashflow is negative {period_label}. You overspent by ₹{abs(net_cashflow):,.0f}. "
            f"Review your top expense categories below."
        )
    else:
        insights.append(f"You're breaking even {period_label}.")

    # 2. Top expense driver
    expense_cats = {k: v for k, v in category_totals.items()
                    if v < 0 and k != "Income / Revenue"}
    if expense_cats:
        top_cat = min(expense_cats, key=expense_cats.get)
        pct = abs(expense_cats[top_cat]) / abs(total_expenses) * 100 if total_expenses else 0
        insights.append(
            f"📊 '{top_cat}' is your biggest cost at {pct:.1f}% of total spend "
            f"(₹{abs(expense_cats[top_cat]):,.0f})."
        )

    # 3. Salary-to-revenue ratio (Indian SMB benchmark: keep < 30%)
    salary = abs(category_totals.get("Salaries & Payroll", 0))
    if salary > 0 and total_income > 0:
        ratio = salary / total_income * 100
        if ratio > 40:
            insights.append(
                f"👥 Salary costs are {ratio:.1f}% of revenue — well above the SMB benchmark of 25–30%. "
                f"Consider productivity improvements."
            )
        elif ratio > 30:
            insights.append(
                f"👥 Salary costs are {ratio:.1f}% of revenue — slightly above the 25–30% benchmark."
            )
        else:
            insights.append(
                f"👥 Salary costs are {ratio:.1f}% of revenue — within a healthy range."
            )

    # 4. Advertising ROI check
    ad_spend = abs(category_totals.get("Advertising & Marketing", 0))
    if ad_spend > 0 and total_income > 0:
        ad_ratio = ad_spend / total_income * 100
        if ad_ratio > 20:
            insights.append(
                f"🔍 Marketing spend is {ad_ratio:.1f}% of revenue (₹{ad_spend:,.0f}). "
                f"Industry benchmark is 10–15%. Review campaign ROI."
            )
        else:
            insights.append(
                f"📣 Marketing spend is {ad_ratio:.1f}% of revenue — within the healthy 10–15% range."
            )

    # 5. GST compliance nudge
    gst_spend = abs(category_totals.get("GST & Tax", 0))
    if gst_spend > 0:
        insights.append(
            f"🧾 ₹{gst_spend:,.0f} in GST/Tax payments recorded. "
            f"Verify GSTR-1 and GSTR-3B filings are current."
        )
    elif total_income > 0:
        insights.append(
            "🧾 No GST payments detected this period. If turnover > ₹20L, ensure compliance is up to date."
        )

    # 6. Logistics cost ratio (common for Shopify/e-commerce)
    logistics = abs(category_totals.get("Logistics & Shipping", 0))
    if logistics > 0 and total_income > 0:
        log_ratio = logistics / total_income * 100
        if log_ratio > 10:
            insights.append(
                f"📦 Shipping costs are {log_ratio:.1f}% of revenue (₹{logistics:,.0f}). "
                f"Consider negotiating bulk rates with Delhivery, Shiprocket, or Bluedart."
            )

    # 7. Uncategorised warning
    uncat = abs(category_totals.get("Uncategorised", 0))
    if uncat > 0:
        insights.append(
            f"❓ ₹{uncat:,.0f} in transactions are uncategorised. "
            f"Use the Transactions page to label them for accurate reporting."
        )

    if not insights:
        insights.append("Upload more transactions to generate insights.")

    return insights
