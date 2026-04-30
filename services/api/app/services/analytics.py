from datetime import date, timedelta, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.expense import Expense
from app.models.refund import Refund
from app.models.product import Product

class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _sum_sales(self, business_id, target_date: date) -> int:
        stmt = select(func.sum(SaleItem.total_kobo)).join(Sale).where(
            Sale.business_id == business_id,
            func.date(Sale.sale_date) == target_date,
            Sale.status != SaleStatus.REFUNDED,
            Sale.deleted_at == None
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _sum_expenses(self, business_id, target_date: date) -> int:
        stmt = select(func.sum(Expense.amount_kobo)).where(
            Expense.business_id == business_id,
            func.date(Expense.expense_date) == target_date,
            Expense.deleted_at == None
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _sum_refunds(self, business_id, target_date: date) -> int:
        stmt = select(func.sum(Refund.amount_kobo)).where(
            Refund.business_id == business_id,
            func.date(Refund.refund_date) == target_date,
            Refund.deleted_at == None
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def _count_sales(self, business_id, target_date: date) -> int:
        stmt = select(func.count(Sale.id)).where(
            Sale.business_id == business_id,
            func.date(Sale.sale_date) == target_date,
            Sale.deleted_at == None
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def get_dashboard(self, business_id) -> dict:
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        # Today's Data
        today_revenue = await self._sum_sales(business_id, today)
        yesterday_revenue = await self._sum_sales(business_id, yesterday)
        today_expenses = await self._sum_expenses(business_id, today)
        today_refunds = await self._sum_refunds(business_id, today)
        
        # Calculations
        net_revenue = today_revenue - today_refunds
        profit = max(0, net_revenue - today_expenses)
        
        # Transaction count
        transaction_count = await self._count_sales(business_id, today)
        
        # Low stock products
        low_stock_result = await self.db.execute(
            select(Product).where(
                Product.business_id == business_id,
                Product.stock_quantity <= Product.low_stock_threshold,
                Product.is_active == True,
                Product.deleted_at == None
            )
        )
        low_stock_products = [{
            "id": p.id,
            "name": p.name,
            "stock_quantity": p.stock_quantity,
            "low_stock_threshold": p.low_stock_threshold
        } for p in low_stock_result.scalars().all()]
        
        # Top products
        top_products_result = await self.db.execute(
            select(
                Product.id, 
                Product.name, 
                func.sum(SaleItem.quantity).label("quantity_sold"),
                func.sum(SaleItem.total_kobo).label("revenue_kobo")
            ).join(SaleItem, Product.id == SaleItem.product_id)
             .join(Sale, SaleItem.sale_id == Sale.id)
             .where(
                 Sale.business_id == business_id,
                 func.date(Sale.sale_date) == today,
                 Sale.status != SaleStatus.REFUNDED,
                 Sale.deleted_at == None
             ).group_by(Product.id)
              .order_by(func.sum(SaleItem.quantity).desc())
              .limit(5)
        )
        top_products = [{
            "product_id": r[0],
            "name": r[1],
            "quantity_sold": r[2],
            "revenue_kobo": r[3]
        } for r in top_products_result.all()]
        
        # Week data (Mon to Today)
        monday = today - timedelta(days=today.weekday())
        week_chart = []
        for i in range(7):
            day = monday + timedelta(days=i)
            if day > today:
                week_chart.append({
                    "label": day.strftime("%a"),
                    "revenue_ngn": 0,
                    "expenses_ngn": 0
                })
                continue
                
            revenue_kobo = await self._sum_sales(business_id, day)
            expenses_kobo = await self._sum_expenses(business_id, day)
            week_chart.append({
                "label": day.strftime("%a"),
                "revenue_ngn": revenue_kobo / 100,
                "expenses_ngn": expenses_kobo / 100
            })
            
        # Pulse state
        revenue_change_pct = 0
        if yesterday_revenue == 0:
            pulse_state = "good" if today_revenue > 0 else "average"
            revenue_change_pct = 1.0 if today_revenue > 0 else 0
        else:
            change = (today_revenue - yesterday_revenue) / yesterday_revenue
            revenue_change_pct = change
            if change >= 0.15: pulse_state = "strong"
            elif change >= 0: pulse_state = "good"
            elif change >= -0.10: pulse_state = "average"
            elif change >= -0.25: pulse_state = "slow"
            else: pulse_state = "alert"
            
        pulse_messages = {
            "strong": "Growth is explosive! Sales are up significantly today.",
            "good": "Steady progress. You're beating yesterday's numbers.",
            "average": "Stability is key. Performance is holding steady.",
            "slow": "A bit quiet today. Consider a quick promo?",
            "alert": "Performance dip detected. Time to review today's operations."
        }
        
        return {
            "today_revenue_kobo": today_revenue,
            "today_revenue_ngn": today_revenue / 100,
            "yesterday_revenue_kobo": yesterday_revenue,
            "yesterday_revenue_ngn": yesterday_revenue / 100,
            "today_expenses_kobo": today_expenses,
            "today_expenses_ngn": today_expenses / 100,
            "today_refunds_kobo": today_refunds,
            "today_refunds_ngn": today_refunds / 100,
            "profit_kobo": profit,
            "profit_ngn": profit / 100,
            "transaction_count": transaction_count,
            "revenue_change_pct": revenue_change_pct,
            "pulse_state": pulse_state,
            "pulse_message": pulse_messages[pulse_state],
            "low_stock_products": low_stock_products,
            "top_products": top_products,
            "week_chart": week_chart
        }
