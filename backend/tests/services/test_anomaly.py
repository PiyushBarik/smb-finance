import json
from datetime import date
from types import SimpleNamespace

from app.services.anomaly import vendor_spike


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
