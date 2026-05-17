"""
Reconciliation v2 — 4-pass deterministic matcher.

Each pass is a pure function operating on plain lists of transaction-like
objects (anything with .id, .amount, .date, .description). Passes return
(matches, unmatched_source, unmatched_bank) so the orchestrator can chain
them. Matches are dicts (not ORM rows) so passes stay DB-agnostic.
"""
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
