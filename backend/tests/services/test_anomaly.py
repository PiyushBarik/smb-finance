import json
from datetime import date
from types import SimpleNamespace

from app.services.anomaly import vendor_spike, payout_cadence_gap


def _txn(id, amount, dt, description=""):
    return SimpleNamespace(id=id, amount=amount, date=dt, description=description, category="Advertising & Marketing")


def test_vendor_spike_flags_three_sigma_deviation():
    # Nine months of ~₹10,000 Google Ads spend with realistic noise,
    # then April spike to ₹50,000.
    history = [
        (date(2023, 7,  15), -10200),
        (date(2023, 8,  15),  -9800),
        (date(2023, 9,  15), -10500),
        (date(2023, 10, 15),  -9700),
        (date(2023, 11, 15), -10100),
        (date(2023, 12, 15),  -9900),
        (date(2024, 1,  15), -10300),
        (date(2024, 2,  15),  -9600),
        (date(2024, 3,  15), -10400),
    ]
    txns = [_txn(i + 1, amt, dt, "Google Ads") for i, (dt, amt) in enumerate(history)]
    # April spike
    txns.append(_txn(len(history) + 1, -50000, date(2024, 4, 15), "Google Ads"))

    anomalies = vendor_spike(txns, current_month=date(2024, 4, 1))
    assert len(anomalies) == 1
    a = anomalies[0]
    assert a["rule_id"] == "vendor_spike"
    assert a["severity"] in ("medium", "high")
    detail = a["detail"]
    assert detail["vendor"].lower().startswith("google")
    assert detail["current"] == 50000.0
    assert 9900 <= detail["mean"] <= 10100   # ~10000 with noise
    assert detail["deviation_sigma"] >= 3.0


def test_vendor_spike_ignores_within_normal_range():
    txns = [_txn(i, -10000, date(2024, m, 15), "Google Ads")
            for i, m in enumerate(range(1, 5), 1)]
    anomalies = vendor_spike(txns, current_month=date(2024, 4, 1))
    assert anomalies == []


def _payout(id, amount, dt):
    return SimpleNamespace(id=id, amount=amount, date=dt,
                           description="NEFT CR SHOPIFY PAYMENTS", category="Income / Revenue")


def test_payout_cadence_gap_flags_missing_weekly_payout():
    # 4 weekly payouts, then a 14-day gap
    payouts = [
        _payout(1, 30000, date(2024, 4, 1)),
        _payout(2, 32000, date(2024, 4, 8)),
        _payout(3, 28000, date(2024, 4, 15)),
        _payout(4, 31000, date(2024, 4, 22)),
        # Expected next payout ~ Apr 29; nothing till May 6
    ]
    anomalies = payout_cadence_gap(payouts, as_of=date(2024, 5, 5))
    assert len(anomalies) == 1
    detail = anomalies[0]["detail"]
    assert detail["days_late"] >= 3
    assert detail["cadence"] == 7


def test_payout_cadence_gap_silent_when_on_time():
    payouts = [
        _payout(1, 30000, date(2024, 4, 1)),
        _payout(2, 30000, date(2024, 4, 8)),
        _payout(3, 30000, date(2024, 4, 15)),
        _payout(4, 30000, date(2024, 4, 22)),
    ]
    anomalies = payout_cadence_gap(payouts, as_of=date(2024, 4, 24))
    assert anomalies == []


from app.services.anomaly import duplicate_within_window


def test_duplicate_flags_same_amount_same_vendor_within_7_days():
    txns = [
        _txn(1, -15000, date(2024, 4, 16), "Google Ads"),
        _txn(2, -15000, date(2024, 4, 17), "Google Ads"),
    ]
    anomalies = duplicate_within_window(txns)
    assert len(anomalies) == 1
    assert anomalies[0]["detail"]["amount"] == 15000.0
    assert set(anomalies[0]["transaction_ids"]) == {1, 2}


def test_duplicate_ignores_outside_window():
    txns = [
        _txn(1, -15000, date(2024, 4, 1), "Google Ads"),
        _txn(2, -15000, date(2024, 4, 10), "Google Ads"),
    ]
    anomalies = duplicate_within_window(txns)
    assert anomalies == []


def test_duplicate_ignores_different_vendor():
    txns = [
        _txn(1, -15000, date(2024, 4, 1), "Google Ads"),
        _txn(2, -15000, date(2024, 4, 2), "Salary Jane"),
    ]
    anomalies = duplicate_within_window(txns)
    assert anomalies == []


from app.services.anomaly import gst_mismatch


def _gst_txn(id, amount, gst_amount):
    return SimpleNamespace(id=id, amount=amount, gst_amount=gst_amount,
                           date=date(2024, 4, 1), description="x", category="Software & Subscriptions")


def test_gst_mismatch_flags_when_stored_diverges_from_recomputed():
    # 1000 expense → expected GST = 1000 * 18/118 = 152.54
    # Stored 200 → delta 47.46 → flag
    txns = [_gst_txn(1, -1000, 200)]
    anomalies = gst_mismatch(txns)
    assert len(anomalies) == 1
    d = anomalies[0]["detail"]
    assert d["stored_gst"] == 200
    assert abs(d["recomputed_gst"] - 152.54) < 0.01


def test_gst_mismatch_silent_when_within_one_rupee():
    # 1000 expense, stored 152.50 (≈152.54) → delta < 1 → no flag
    txns = [_gst_txn(1, -1000, 152.50)]
    anomalies = gst_mismatch(txns)
    assert anomalies == []
