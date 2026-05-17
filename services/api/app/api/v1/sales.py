from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from app.database import get_db
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.business import Business
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleResponse, SaleItemRead
from app.schemas.common import ApiResponse, PaginatedResponse, Meta
from app.dependencies import get_current_business, get_owner, get_any_staff
from app.core.audit import log_action

router = APIRouter(prefix="/sales", tags=["sales"])

def map_sale_response(sale: Sale) -> SaleResponse:
    items_data = []
    grand_total_kobo = 0
    for item in sale.items:
        item_total = item.total_kobo
        grand_total_kobo += item_total
        items_data.append(SaleItemRead(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product.name,
            quantity=item.quantity,
            unit_price_kobo=item.unit_price_kobo,
            total_kobo=item_total
        ))
    
    return SaleResponse(
        id=sale.id,
        payment_method=sale.payment_method,
        status=sale.status,
        notes=sale.notes,
        sale_date=sale.sale_date,
        items=items_data,
        grand_total_kobo=grand_total_kobo,
        grand_total_ngn=grand_total_kobo / 100,
        created_at=sale.created_at
    )

@router.post("", response_model=ApiResponse[SaleResponse])
async def create_sale(
    request: Request,
    body: SaleCreate,
    current_user: User = Depends(get_any_staff),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    # 1. Load all products
    product_ids = [item.product_id for item in body.items]
    result = await db.execute(
        select(Product).where(
            Product.id.in_(product_ids),
            Product.business_id == business.id,
            Product.deleted_at == None
        )
    )
    products = {p.id: p for p in result.scalars().all()}
    
    # 2. Verify all products found
    if len(products) != len(set(product_ids)):
        raise HTTPException(status_code=400, detail="One or more products not found")
    
    # Start process
    new_sale = Sale(
        business_id=business.id,
        payment_method=body.payment_method,
        notes=body.notes,
        sale_date=datetime.utcnow()
    )
    db.add(new_sale)
    await db.flush() # Get sale ID
    
    grand_total_kobo = 0
    sale_items = []
    
    for item in body.items:
        product = products[item.product_id]
        
        # 4. & 5. Calculate prices
        unit_price = product.selling_price_kobo
        item_total = unit_price * item.quantity
        grand_total_kobo += item_total
        
        # 6. Deduct stock atomically so concurrent sales cannot oversell.
        stock_result = await db.execute(
            update(Product)
            .where(
                Product.id == product.id,
                Product.business_id == business.id,
                Product.deleted_at == None,
                Product.stock_quantity >= item.quantity,
            )
            .values(stock_quantity=Product.stock_quantity - item.quantity)
        )
        if stock_result.rowcount != 1:
            await db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}",
            )
        
        # 8. Prepare SaleItem
        si = SaleItem(
            sale_id=new_sale.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price_kobo=unit_price,
            total_kobo=item_total
        )
        sale_items.append(si)
    
    db.add_all(sale_items)
    
    # 9. Commit transaction
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process sale: {str(e)}")
        
    # Refresh to get relationships for response
    # We need to eager load or refresh carefully in async
    final_result = await db.execute(
        select(Sale).where(Sale.id == new_sale.id)
    )
    sale = final_result.scalar_one()
    # Ensure items and products are loaded for mapping
    # In a real app we'd use selectinload
    
    # For now, we'll re-fetch with relationships
    from sqlalchemy.orm import selectinload
    stmt = select(Sale).options(
        selectinload(Sale.items).selectinload(SaleItem.product)
    ).where(Sale.id == new_sale.id)
    result = await db.execute(stmt)
    sale = result.scalar_one()

    # Invalidate cache
    from app.core.cache import invalidate_dashboard_cache
    await invalidate_dashboard_cache(str(business.id))

    await log_action(
        db=db,
        user=current_user,
        action="sale.created",
        resource="sale",
        resource_id=sale.id,
        detail=f"Processed sale: {len(sale.items)} items, Total: {grand_total_kobo / 100} NGN",
        ip_address=request.client.host if request.client else None,
    )

    return ApiResponse(data=map_sale_response(sale))

@router.get("", response_model=PaginatedResponse[SaleResponse])
async def list_sales(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    payment_method: Optional[str] = Query(None),
    current_user: User = Depends(get_any_staff),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    query = select(Sale).options(
        selectinload(Sale.items).selectinload(SaleItem.product)
    ).where(
        Sale.business_id == business.id,
        Sale.deleted_at == None
    )
    
    if start_date:
        query = query.where(Sale.sale_date >= start_date)
    if end_date:
        query = query.where(Sale.sale_date <= end_date)
    if payment_method:
        query = query.where(Sale.payment_method == payment_method)
        
    query = query.order_by(Sale.sale_date.desc())
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Pagination
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    sales = result.scalars().all()
    
    return PaginatedResponse(
        data=[map_sale_response(s) for s in sales],
        meta=Meta(page=page, per_page=per_page, total=total)
    )

@router.get("/{sale_id}", response_model=ApiResponse[SaleResponse])
async def get_sale(
    sale_id: UUID,
    current_user: User = Depends(get_any_staff),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Sale).options(
            selectinload(Sale.items).selectinload(SaleItem.product)
        ).where(
            Sale.id == sale_id,
            Sale.business_id == business.id,
            Sale.deleted_at == None
        )
    )
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    return ApiResponse(data=map_sale_response(sale))

@router.delete("/{sale_id}", response_model=ApiResponse[dict])
async def delete_sale(
    request: Request,
    sale_id: UUID,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Sale).where(
            Sale.id == sale_id,
            Sale.business_id == business.id,
            Sale.deleted_at == None
        )
    )
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    sale.deleted_at = datetime.utcnow()
    await db.commit()
    
    await log_action(
        db=db,
        user=current_user,
        action="sale.deleted",
        resource="sale",
        resource_id=sale.id,
        detail=f"Deleted sale record",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data={"id": sale_id}, message="Sale soft deleted")
