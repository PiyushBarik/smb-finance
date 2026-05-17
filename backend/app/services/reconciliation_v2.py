"""
Reconciliation v2 — 4-pass deterministic matcher.

Each pass is a pure function operating on plain lists of transaction-like
objects (anything with .id, .amount, .date, .description). Passes return
(matches, unmatched_source, unmatched_bank) so the orchestrator can chain
them. Matches are dicts (not ORM rows) so passes stay DB-agnostic.
"""
import re
from typing import List, Tuple, Any


def pass_exact(
    source: List[Any],
    bank: List[Any],
) -> Tuple[List[dict], List[Any], List[Any]]:
    """Pass 1: exact abs(amount) match within ±1 day. High confidence.
    Ambiguous candidates (>1 match) are deferred to later passes.
    """
    matches: List[dict] = []
    matched_src_ids: set[int] = set()
    matched_bank_ids: set[int] = set()

    for s in source:
        candidates = [
            b for b in bank
            if b.id not in matched_bank_ids
            and abs(s.amount) == abs(b.amount)
            and abs((s.date - b.date).days) <= 1
        ]
        if len(candidates) == 1:
            b = candidates[0]
            matches.append({
                "source_id": s.id,
                "bank_id":   b.id,
                "confidence": "high",
                "pass_no":   1,
                "inferred_fee": None,
            })
            matched_src_ids.add(s.id)
            matched_bank_ids.add(b.id)

    unmatched_src  = [s for s in source if s.id not in matched_src_ids]
    unmatched_bank = [b for b in bank   if b.id not in matched_bank_ids]
    return matches, unmatched_src, unmatched_bank


_WORD_RE = re.compile(r"[a-z0-9]+")


def _tokens(text: str | None) -> set[str]:
    if not text:
        return set()
    return {t for t in _WORD_RE.findall(text.lower()) if len(t) > 2}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 0.0
    return len(a & b) / max(1, len(a | b))


def pass_fuzzy(
    source: List[Any],
    bank: List[Any],
) -> Tuple[List[dict], List[Any], List[Any]]:
    """Pass 2: fuzzy amount (±2% or ±₹2 absolute) + date window (±3 days).
    Score = 0.4*amount + 0.3*date + 0.3*description-overlap. Threshold 0.55."""
    matches: List[dict] = []
    matched_src_ids: set[int] = set()
    matched_bank_ids: set[int] = set()

    for s in source:
        s_amt = abs(s.amount)
        tolerance = max(2.0, s_amt * 0.02)
        s_toks = _tokens(s.description)
        best: tuple[float, Any] | None = None
        for b in bank:
            if b.id in matched_bank_ids:
                continue
            amt_delta = abs(s_amt - abs(b.amount))
            if amt_delta > tolerance:
                continue
            day_delta = abs((s.date - b.date).days)
            if day_delta > 3:
                continue
            amount_proximity = 1.0 - (amt_delta / tolerance if tolerance else 0)
            date_proximity   = 1.0 - (day_delta / 3.0)
            overlap          = _jaccard(s_toks, _tokens(b.description))
            score = 0.4 * amount_proximity + 0.3 * date_proximity + 0.3 * overlap
            if score >= 0.55 and (best is None or score > best[0]):
                best = (score, b)

        if best:
            _, b = best
            matches.append({
                "source_id":   s.id,
                "bank_id":     b.id,
                "confidence":  "medium",
                "pass_no":     2,
                "inferred_fee": None,
            })
            matched_src_ids.add(s.id)
            matched_bank_ids.add(b.id)

    unmatched_src  = [s for s in source if s.id not in matched_src_ids]
    unmatched_bank = [b for b in bank   if b.id not in matched_bank_ids]
    return matches, unmatched_src, unmatched_bank
