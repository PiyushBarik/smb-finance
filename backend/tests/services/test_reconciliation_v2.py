from datetime import date
from types import SimpleNamespace

from app.services.reconciliation_v2 import pass_exact


def _txn(id, amount, dt, description=""):
    return SimpleNamespace(id=id, amount=amount, date=dt, description=description)


def test_pass_exact_pairs_same_amount_same_day():
    source = [_txn(1, -5000, date(2024, 4, 5), "Google Ads")]
    bank   = [_txn(2,  5000, date(2024, 4, 5), "GOOGLE ADS DEBIT")]

    matches, unmatched_src, unmatched_bank = pass_exact(source, bank)

    assert len(matches) == 1
    assert matches[0]["source_id"] == 1
    assert matches[0]["bank_id"] == 2
    assert matches[0]["confidence"] == "high"
    assert matches[0]["pass_no"] == 1
    assert unmatched_src == []
    assert unmatched_bank == []


def test_pass_exact_pairs_within_one_day_window():
    source = [_txn(1, -5000, date(2024, 4, 5))]
    bank   = [_txn(2,  5000, date(2024, 4, 6))]
    matches, _, _ = pass_exact(source, bank)
    assert len(matches) == 1


def test_pass_exact_does_not_pair_outside_window():
    source = [_txn(1, -5000, date(2024, 4, 5))]
    bank   = [_txn(2,  5000, date(2024, 4, 7))]
    matches, unmatched_src, unmatched_bank = pass_exact(source, bank)
    assert matches == []
    assert len(unmatched_src) == 1
    assert len(unmatched_bank) == 1


def test_pass_exact_defers_ambiguous_to_later_pass():
    source = [_txn(1, -5000, date(2024, 4, 5))]
    bank   = [_txn(2, 5000, date(2024, 4, 5)),
              _txn(3, 5000, date(2024, 4, 5))]
    matches, unmatched_src, unmatched_bank = pass_exact(source, bank)
    # Ambiguous → no match, source returned for pass 2
    assert matches == []
    assert len(unmatched_src) == 1
    assert len(unmatched_bank) == 2
