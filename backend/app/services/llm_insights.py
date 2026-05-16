"""
LLM-powered CFO insights using Claude claude-sonnet-4-20250514.
Falls back gracefully to rules-based insights if API key is not set.
"""
from typing import List, Dict
from app.core.config import settings
from app.services.insights import generate_insights   # rules-based fallback


def generate_llm_insights(
    category_totals: Dict[str, float],
    total_income: float,
    total_expenses: float,
    net_cashflow: float,
    period_label: str,
    org_name: str = "",
    transaction_count: int = 0,
) -> List[str]:
    """
    Try Claude first. If ANTHROPIC_API_KEY is not set or call fails,
    fall back to the rules-based engine transparently.
    """
    if not settings.ANTHROPIC_API_KEY:
        return generate_insights(category_totals, total_income, total_expenses, net_cashflow, period_label)

    try:
        return _call_claude(
            category_totals, total_income, total_expenses,
            net_cashflow, period_label, org_name, transaction_count
        )
    except Exception as e:
        # Graceful fallback — never crash the dashboard
        print(f"[LLM insights] Fell back to rules engine: {e}")
        return generate_insights(category_totals, total_income, total_expenses, net_cashflow, period_label)


def _call_claude(
    category_totals: Dict[str, float],
    total_income: float,
    total_expenses: float,
    net_cashflow: float,
    period_label: str,
    org_name: str,
    transaction_count: int,
) -> List[str]:
    import anthropic, json

    # Build a compact financial summary for the prompt
    expense_lines = [
        f"  • {cat}: ₹{abs(amt):,.0f}"
        for cat, amt in sorted(category_totals.items(), key=lambda x: x[1])
        if amt < 0
    ]
    income_lines = [
        f"  • {cat}: ₹{abs(amt):,.0f}"
        for cat, amt in category_totals.items()
        if amt > 0
    ]
    margin = (net_cashflow / total_income * 100) if total_income else 0

    prompt = f"""You are a CFO advisor for an Indian SMB. Analyse this financial data and give 5–7 
plain-English bullet-point insights. Be specific, use the actual numbers, and flag risks.
Use Indian business context (GST, Diwali demand, logistics costs, etc.) where relevant.
Each insight must start with an emoji and be 1–2 sentences max. Return ONLY a JSON array of strings.

Business: {org_name or "Indian SMB"}
Period: {period_label}
Transactions: {transaction_count}

Revenue:
{chr(10).join(income_lines) or "  • No income recorded"}

Expenses:
{chr(10).join(expense_lines) or "  • No expenses recorded"}

Summary:
  Total income:   ₹{total_income:,.0f}
  Total expenses: ₹{abs(total_expenses):,.0f}
  Net cashflow:   ₹{net_cashflow:,.0f}
  Net margin:     {margin:.1f}%

Indian SMB benchmarks:
  Salary/revenue: healthy < 30%, warning > 40%
  Marketing/revenue: healthy < 15%, warning > 20%
  Logistics/revenue: healthy < 10%, warning > 15%
  GST compliance: mandatory if turnover > ₹20L/year

Respond with ONLY a valid JSON array of strings, no markdown, no preamble."""

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    # Strip any accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    insights: List[str] = json.loads(raw.strip())
    return insights if isinstance(insights, list) else [str(insights)]
