"""
Deterministic anomaly rules. Each rule is a pure function:
  (transactions: list, **rule-specific-args) -> list[dict]

Returned dicts are NOT ORM rows — orchestrator persists them.
Schema per rule:
  {
    "rule_id":         str,
    "severity":        "low" | "medium" | "high",
    "transaction_ids": list[int],
    "detail":          dict (rule-specific evidence schema),
  }
"""
import hashlib
import json
import re
import statistics
from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Iterable


_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _vendor_key(description: str | None) -> str:
    """Cluster vendor identity by the longest non-trivial token."""
    if not description:
        return "unknown"
    toks = [t for t in _TOKEN_RE.findall(description.lower()) if len(t) > 3]
    if not toks:
        return description.lower()[:32]
    # Use longest as canonical — usually the brand name beats noise like "DEBIT".
    return max(toks, key=len)


def vendor_spike(
    transactions: list[Any],
    current_month: date,
) -> list[dict]:
    """3σ rule on monthly vendor spend.

    Group expenses (amount < 0) by vendor + month. For each vendor with at
    least 4 prior months of data, compute mean+stddev and flag current-month
    spend > mean + 3σ.
    """
    # Group: vendor -> {month_str -> total_abs_spend}
    by_vendor: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    by_vendor_ids: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))

    cur_key = current_month.strftime("%Y-%m")

    for t in transactions:
        if t.amount >= 0 or not t.date:
            continue
        vendor = _vendor_key(t.description)
        m_key = t.date.strftime("%Y-%m")
        by_vendor[vendor][m_key] += abs(t.amount)
        by_vendor_ids[vendor][m_key].append(t.id)

    anomalies: list[dict] = []
    for vendor, months in by_vendor.items():
        if cur_key not in months:
            continue
        prior_months = {k: v for k, v in months.items() if k < cur_key}
        if len(prior_months) < 4:
            continue
        prior_values = list(prior_months.values())
        mean = statistics.mean(prior_values)
        stddev = statistics.stdev(prior_values) if len(prior_values) > 1 else 0.0
        current = months[cur_key]
        if current <= mean:
            continue

        if stddev == 0:
            continue

        deviation = (current - mean) / stddev
        if deviation < 3.0:
            continue

        anomalies.append({
            "rule_id":         "vendor_spike",
            "severity":        "high" if deviation >= 5.0 else "medium",
            "transaction_ids": by_vendor_ids[vendor][cur_key],
            "detail": {
                "vendor":           vendor,
                "current":          round(current, 2),
                "mean":             round(mean, 2),
                "stddev":           round(stddev, 2),
                "deviation_sigma":  round(deviation, 2),
                "month":            cur_key,
            },
        })

    return anomalies


def evidence_hash(anomaly: dict) -> str:
    """Deterministic hash for dedup: rule_id + sorted transaction_ids + key detail fields."""
    txn_ids = sorted(anomaly["transaction_ids"])
    detail_str = json.dumps(anomaly["detail"], sort_keys=True, default=str)
    return hashlib.sha256(
        f"{anomaly['rule_id']}:{txn_ids}:{detail_str}".encode()
    ).hexdigest()
