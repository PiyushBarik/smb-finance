"""
GST / bank reconciliation.
Matches transactions from two upload batches by amount and normalised description.
Phase 3: add fuzzy-match tolerance and date-window matching.
"""
import re
from typing import List, Tuple

from app.models.transaction import Transaction


def _normalise(text: str) -> str:
    """Lowercase, replace hyphens/underscores with spaces, strip punctuation, collapse whitespace."""
    text = text.lower()
    text = re.sub(r"[-_/]", " ", text)          # hyphens → spaces first
    text = re.sub(r"[^a-z0-9\s]", "", text)     # strip remaining punctuation
    text = re.sub(r"\s+", " ", text).strip()
    return text


def reconcile_batches(
    source_txns: List[Transaction],
    bank_txns: List[Transaction],
) -> dict:
    """
    Try to pair each source transaction with a bank transaction
    that has the same absolute amount and a similar description.

    Returns a dict with:
      matched_pairs   – number of pairs found
      unmatched_source – source txns with no bank match
      unmatched_bank   – bank txns with no source match
      details          – list of match/no-match info dicts
    """
    bank_pool = list(bank_txns)
    matched: List[Tuple[Transaction, Transaction]] = []
    unmatched_source: List[Transaction] = []
    details: List[dict] = []

    for src in source_txns:
        best_match = None
        for bank in bank_pool:
            if abs(src.amount) != abs(bank.amount):
                continue
            src_words = set(_normalise(src.description or "").split())
            bank_words = set(_normalise(bank.description or "").split())
            # Remove very short stop-words that add noise
            src_words = {w for w in src_words if len(w) > 2}
            bank_words = {w for w in bank_words if len(w) > 2}
            overlap = src_words & bank_words
            if overlap or (not src_words and not bank_words):
                best_match = bank
                break

        if best_match:
            matched.append((src, best_match))
            bank_pool.remove(best_match)
            details.append({
                "status": "matched",
                "source_id": src.id,
                "bank_id": best_match.id,
                "amount": src.amount,
                "source_desc": src.description,
                "bank_desc": best_match.description,
            })
        else:
            unmatched_source.append(src)
            details.append({
                "status": "unmatched_source",
                "source_id": src.id,
                "amount": src.amount,
                "source_desc": src.description,
            })

    for bank in bank_pool:
        details.append({
            "status": "unmatched_bank",
            "bank_id": bank.id,
            "amount": bank.amount,
            "bank_desc": bank.description,
        })

    return {
        "matched_pairs": len(matched),
        "unmatched_source": len(unmatched_source),
        "unmatched_bank": len(bank_pool),
        "details": details,
    }
