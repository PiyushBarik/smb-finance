from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, List
import datetime


class TransactionOut(BaseModel):
    id: int
    date: Optional[datetime.date] = None
    description: Optional[str] = None
    amount: float
    currency: str
    category: Optional[str] = None
    gst_amount: Optional[float] = None
    is_reconciled: bool
    batch_id: int

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    items: List[TransactionOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class CategoryPatchRequest(BaseModel):
    category: str


class UploadBatchOut(BaseModel):
    id: int
    filename: str
    source: str
    row_count: int

    class Config:
        from_attributes = True


class CategoryTotal(BaseModel):
    category: str
    total: float
    count: int
    percentage: float = 0.0


class MonthlyPoint(BaseModel):
    month: str
    month_label: str
    income: float
    expenses: float
    net: float


class GSTLine(BaseModel):
    category: str
    taxable_amount: float
    gst_amount: float
    cgst: float
    sgst: float
    igst: float


class GSTSummaryResponse(BaseModel):
    org_id: int
    period_label: str
    total_taxable: float
    total_gst: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    lines: List[GSTLine]


class SummaryResponse(BaseModel):
    org_id: int
    period_label: str
    total_income: float
    total_expenses: float
    net_cashflow: float
    transaction_count: int
    category_totals: List[CategoryTotal]
    monthly_trend: List[MonthlyPoint]
    insights: List[str]


class ReconcileResult(BaseModel):
    matched_pairs: int
    unmatched_source: int
    unmatched_bank: int
    match_rate: float
    details: List[dict]
