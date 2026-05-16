"""
Email report service.
Sends a formatted HTML P&L summary to a recipient via SMTP.
Requires SMTP_HOST, SMTP_USER, SMTP_PASSWORD in settings/.env.
"""
import asyncio
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List

from app.core.config import settings


EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body  {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #09090b; color: #e4e4e7; margin: 0; padding: 0; }}
  .wrap {{ max-width: 600px; margin: 0 auto; padding: 32px 24px; }}
  .logo {{ color: #34d399; font-size: 20px; font-weight: 700; margin-bottom: 24px; }}
  h1    {{ font-size: 22px; font-weight: 700; color: #fff; margin: 0 0 4px; }}
  .period {{ color: #71717a; font-size: 13px; margin-bottom: 28px; }}
  .cards{{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }}
  .card {{ background: #18181b; border: 1px solid #27272a; border-radius: 10px;
           padding: 16px 20px; }}
  .card-label {{ font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
                 color: #71717a; margin-bottom: 4px; }}
  .card-value {{ font-size: 22px; font-weight: 700; }}
  .green  {{ color: #34d399; }}
  .red    {{ color: #f87171; }}
  .blue   {{ color: #60a5fa; }}
  table   {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
  th      {{ background: #18181b; color: #a1a1aa; font-size: 11px; text-transform: uppercase;
             letter-spacing: .06em; padding: 10px 12px; text-align: left; }}
  td      {{ padding: 10px 12px; border-bottom: 1px solid #27272a; font-size: 13px; color: #d4d4d8; }}
  .amt    {{ text-align: right; font-family: monospace; }}
  .insights {{ background: #18181b; border: 1px solid #27272a; border-radius: 10px;
               padding: 20px; margin-bottom: 24px; }}
  .insights h3 {{ margin: 0 0 12px; font-size: 14px; color: #facc15; }}
  .insights li {{ font-size: 13px; color: #d4d4d8; margin-bottom: 8px; line-height: 1.5; }}
  .footer {{ font-size: 11px; color: #52525b; text-align: center; margin-top: 32px; }}
  .btn    {{ display: inline-block; background: #34d399; color: #09090b; font-weight: 600;
             font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;
             margin-bottom: 24px; }}
</style>
</head>
<body>
<div class="wrap">
  <div class="logo">📊 ClarityBooks</div>
  <h1>{org_name}</h1>
  <div class="period">Period: {period_label}</div>

  <div class="cards">
    <div class="card">
      <div class="card-label">Total Income</div>
      <div class="card-value green">{income}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Expenses</div>
      <div class="card-value red">{expenses}</div>
    </div>
    <div class="card">
      <div class="card-label">Net Cashflow</div>
      <div class="card-value {net_color}">{net}</div>
    </div>
    <div class="card">
      <div class="card-label">Net Margin</div>
      <div class="card-value blue">{margin}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Category</th><th class="amt">Amount</th><th class="amt">% of Spend</th></tr>
    </thead>
    <tbody>
      {expense_rows}
    </tbody>
  </table>

  <div class="insights">
    <h3>💡 CFO Insights</h3>
    <ul>
      {insight_items}
    </ul>
  </div>

  <a href="http://localhost:3000/dashboard" class="btn">View Full Dashboard →</a>

  <div class="footer">
    ClarityBooks · This report was generated automatically.<br>
    Unsubscribe by adjusting your notification settings.
  </div>
</div>
</body>
</html>
"""


def fmt_inr(v: float) -> str:
    return f"₹{abs(v):,.0f}"


def build_email_html(
    org_name: str,
    period_label: str,
    total_income: float,
    total_expenses: float,
    net_cashflow: float,
    category_totals: list,
    insights: List[str],
) -> str:
    margin = (net_cashflow / total_income * 100) if total_income else 0

    expense_rows = "".join(
        f'<tr><td>{c.category}</td>'
        f'<td class="amt" style="color:#f87171">{fmt_inr(c.total)}</td>'
        f'<td class="amt">{c.percentage:.1f}%</td></tr>'
        for c in category_totals if c.total < 0
    )

    insight_items = "".join(f"<li>{ins}</li>" for ins in insights)

    return EMAIL_TEMPLATE.format(
        org_name=org_name,
        period_label=period_label,
        income=fmt_inr(total_income),
        expenses=fmt_inr(total_expenses),
        net=("+" if net_cashflow >= 0 else "−") + fmt_inr(net_cashflow),
        net_color="green" if net_cashflow >= 0 else "red",
        margin=f"{margin:.1f}%",
        expense_rows=expense_rows or "<tr><td colspan='3' style='color:#71717a'>No expenses recorded</td></tr>",
        insight_items=insight_items,
    )


def send_report_email(
    to_email: str,
    org_name: str,
    period_label: str,
    html_body: str,
    attachment_bytes: Optional[bytes] = None,
    attachment_name: str = "report.xlsx",
) -> dict:
    """
    Send HTML email synchronously via SMTP.
    Returns {"sent": True} or {"sent": False, "error": str}.
    """
    if not settings.SMTP_HOST:
        return {"sent": False, "error": "SMTP not configured — set SMTP_HOST in .env"}

    try:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = f"ClarityBooks Report — {org_name} — {period_label}"
        msg["From"]    = settings.SMTP_FROM
        msg["To"]      = to_email

        msg.attach(MIMEText(html_body, "html", "utf-8"))

        if attachment_bytes:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment_bytes)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{attachment_name}"')
            msg.attach(part)

        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())

        return {"sent": True}

    except Exception as e:
        return {"sent": False, "error": str(e)}
