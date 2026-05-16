"""
Rules-based expense categorisation.
Extend RULES with more keywords as you grow.
Phase 3: swap this for an LLM call.

Order matters — first match wins.
Income rules are checked before software rules so "Shopify Payout" → Income, not Software.
"""
from typing import Optional

# Each entry: (category, keywords_list)
# First match wins, so income keywords come before software
RULES: list[tuple[str, list[str]]] = [
    ("Income / Revenue", [
        "payout", "settlement", "payment received", "sale", "order",
        "refund received", "credit note", "shopify payout", "transfer in",
        "neft cr", "imps cr",
    ]),
    ("Advertising & Marketing", [
        "google ads", "facebook ads", "meta ads", "instagram ad",
        "advertisement", "marketing", "promotion", "campaign", "seo", "influencer",
    ]),
    ("Software & Subscriptions", [
        "shopify", "aws", "azure", "gcp", "google cloud", "notion", "slack",
        "zoom", "subscription", "saas", "software", "license", "plugin",
    ]),
    ("Logistics & Shipping", [
        "delhivery", "bluedart", "dtdc", "fedex", "dhl", "shipping", "courier",
        "freight", "logistics", "delivery", "dispatch",
    ]),
    ("Inventory & COGS", [
        "inventory", "stock", "purchase", "supplier", "vendor", "raw material",
        "cogs", "goods", "wholesale",
    ]),
    ("Salaries & Payroll", [
        "salary", "payroll", "wages", "staff", "employee", "stipend",
        "compensation", "hr",
    ]),
    ("Rent & Utilities", [
        "rent", "electricity", "water", "gas", "utility", "office", "lease",
        "maintenance", "repair",
    ]),
    ("GST & Tax", [
        "gst", "igst", "cgst", "sgst", "tds", "income tax", "advance tax",
    ]),
    ("Banking & Finance", [
        "bank charges", "processing fee", "interest", "loan", "emi", "razorpay",
        "paytm", "stripe", "payment gateway",
    ]),
    ("Travel & Meals", [
        "travel", "flight", "hotel", "cab", "uber", "ola", "restaurant",
        "meal", "food", "zomato", "swiggy",
    ]),
]


def categorize(description: Optional[str], amount: float) -> str:
    if not description:
        return "Income / Revenue" if amount > 0 else "Uncategorised"

    desc_lower = description.lower()
    for category, keywords in RULES:
        if any(kw in desc_lower for kw in keywords):
            return category

    # Fallback heuristic
    if amount > 0:
        return "Income / Revenue"

    return "Uncategorised"
