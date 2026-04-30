from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class LowStockProduct(BaseModel):
    id: UUID
    name: str
    stock_quantity: int
    low_stock_threshold: int

class TopProduct(BaseModel):
    product_id: UUID
    name: str
    quantity_sold: int
    revenue_kobo: int

class ChartItem(BaseModel):
    label: str
    revenue_ngn: float
    expenses_ngn: float

class DashboardResponse(BaseModel):
    today_revenue_kobo: int
    today_revenue_ngn: float
    yesterday_revenue_kobo: int
    yesterday_revenue_ngn: float
    today_expenses_kobo: int
    today_expenses_ngn: float
    today_refunds_kobo: int
    today_refunds_ngn: float
    profit_kobo: int
    profit_ngn: float
    transaction_count: int
    revenue_change_pct: float
    pulse_state: str # "strong" | "good" | "average" | "slow" | "alert"
    pulse_message: str
    low_stock_products: List[LowStockProduct]
    top_products: List[TopProduct]
    week_chart: List[ChartItem]
