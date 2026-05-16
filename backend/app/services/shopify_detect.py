"""
Shopify payout CSV auto-detection and normalisation.

Shopify exports have non-standard headers like:
  "Payout Date", "Description", "Amount", "Currency", "Fee", "Net"
  or "Transaction Date", "Type", "Order", "Amount"

This service detects the format and maps columns to our standard names.
"""
import pandas as pd
from typing import Optional, Tuple


# Known Shopify column name patterns
SHOPIFY_AMOUNT_COLS   = ["net", "amount", "total", "gross", "settlement amount"]
SHOPIFY_DATE_COLS     = ["payout date", "transaction date", "date", "created at"]
SHOPIFY_DESC_COLS     = ["description", "type", "order", "source", "reference"]
SHOPIFY_CURRENCY_COLS = ["currency"]

# Columns that strongly suggest a Shopify export
SHOPIFY_SIGNATURES = [
    {"payout date", "net"},
    {"payout date", "amount"},
    {"transaction date", "type", "order"},
    {"source", "currency", "net"},
    {"shopify payments", "description"},
]


def detect_shopify(df: pd.DataFrame) -> bool:
    """Return True if this looks like a Shopify payout export."""
    cols_lower = {c.lower().strip() for c in df.columns}
    return any(sig.issubset(cols_lower) for sig in SHOPIFY_SIGNATURES)


def _find_col(df: pd.DataFrame, candidates: list[str]) -> Optional[str]:
    """Find the first column whose lowercase name matches any candidate."""
    col_map = {c.lower().strip(): c for c in df.columns}
    for candidate in candidates:
        if candidate in col_map:
            return col_map[candidate]
    return None


def normalise_shopify(df: pd.DataFrame) -> Tuple[pd.DataFrame, str, str, Optional[str]]:
    """
    Normalise a Shopify CSV into standard columns.
    Returns (normalised_df, amount_col, desc_col, date_col).
    """
    amount_col = _find_col(df, SHOPIFY_AMOUNT_COLS)
    desc_col   = _find_col(df, SHOPIFY_DESC_COLS)
    date_col   = _find_col(df, SHOPIFY_DATE_COLS)
    curr_col   = _find_col(df, SHOPIFY_CURRENCY_COLS)

    # Shopify sometimes puts fees as a separate column — subtract from gross
    fee_col = _find_col(df, ["fee", "fees", "shopify fee", "processing fee"])
    if fee_col and amount_col:
        df = df.copy()
        df[amount_col] = pd.to_numeric(df[amount_col], errors="coerce").fillna(0)
        df[fee_col]    = pd.to_numeric(df[fee_col],    errors="coerce").fillna(0)
        # Fees are usually already negative in Shopify exports; only subtract positives
        df[amount_col] = df.apply(
            lambda r: r[amount_col] - abs(r[fee_col]) if r[fee_col] > 0 else r[amount_col],
            axis=1,
        )

    # Rename "Net" → "amount" for downstream compatibility
    if amount_col and amount_col.lower() != "amount":
        df = df.rename(columns={amount_col: "amount"})
        amount_col = "amount"

    return df, amount_col or "amount", desc_col or "", date_col
