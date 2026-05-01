from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, or_
from datetime import datetime
from typing import Optional, List
from uuid import UUID
import pandas as pd
from google import genai
from google.genai import types
import asyncio
import json
import io
import csv
import base64
import uuid as uuid_lib

from app.database import get_db
from app.models.product import Product
from app.models.business import Business
from app.models.user import User
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, 
    StockAdjustmentRequest
)
from app.schemas.common import ApiResponse, PaginatedResponse, Meta
from app.dependencies import get_current_business, get_owner, get_any_staff
from app.core.audit import log_action
from app.config import settings


router = APIRouter(prefix="/products", tags=["products"])

def to_ngn(kobo: int) -> float:
    return kobo / 100

def to_kobo(ngn: float) -> int:
    return int(round(ngn * 100))

def map_product_response(p: Product) -> ProductResponse:
    return ProductResponse(
        id=p.id,
        name=p.name,
        sku=p.sku,
        category=p.category,
        unit=p.unit,
        selling_price_kobo=p.selling_price_kobo,
        selling_price_ngn=to_ngn(p.selling_price_kobo),
        cost_price_kobo=p.cost_price_kobo,
        cost_price_ngn=to_ngn(p.cost_price_kobo),
        stock_quantity=p.stock_quantity,
        low_stock_threshold=p.low_stock_threshold,
        is_low_stock=p.stock_quantity <= p.low_stock_threshold,
        is_active=p.is_active,
        created_at=p.created_at
    )

@router.post("", response_model=ApiResponse[ProductResponse])
async def create_product(
    request: Request,
    body: ProductCreate,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    new_product = Product(
        business_id=business.id,
        name=body.name,
        sku=body.sku,
        category=body.category,
        selling_price_kobo=to_kobo(body.selling_price_ngn),
        cost_price_kobo=to_kobo(body.cost_price_ngn),
        stock_quantity=body.stock_quantity,
        low_stock_threshold=body.low_stock_threshold,
        unit=body.unit
    )
    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)
    
    await log_action(
        db=db,
        user=current_user,
        action="product.created",
        resource="product",
        resource_id=new_product.id,
        detail=f"Created product: {new_product.name}",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data=map_product_response(new_product))

@router.get("", response_model=PaginatedResponse[ProductResponse])
async def list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    low_stock: bool = Query(False),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_any_staff),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    query = select(Product).where(
        Product.business_id == business.id,
        Product.deleted_at == None
    )
    
    if low_stock:
        query = query.where(Product.stock_quantity <= Product.low_stock_threshold)
    
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Pagination
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    products = result.scalars().all()
    
    return PaginatedResponse(
        data=[map_product_response(p) for p in products],
        meta=Meta(page=page, per_page=per_page, total=total)
    )

@router.post("/import-csv/preview")
async def preview_csv_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
):
    print(f"DEBUG: preview_csv_import hit for business {business.id}")
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    contents = await file.read()
    try:
        # Try UTF-8 first, then try with BOM, then try latin-1
        try:
            df = pd.read_csv(io.BytesIO(contents))
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(io.BytesIO(contents), encoding="utf-8-sig")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(contents), encoding="latin-1")
    except Exception as e:
        raise HTTPException(status_code=400,
                            detail=f"Could not read CSV file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    if len(df) > 1000:
        raise HTTPException(status_code=400,
                            detail="Maximum 1000 products per import")

    columns = df.columns.tolist()
    sample = df.head(3).to_dict(orient="records")

    client = genai.Client(api_key=settings.gemini_api_key)
    prompt = f"""
You are mapping CSV columns to a product database schema.

CSV columns found: {columns}
Sample rows: {json.dumps(sample, default=str)}

Map each CSV column to one of these schema fields:
- product_name (required)
- selling_price_ngn (required)
- cost_price_ngn (optional)
- category (optional)
- stock_quantity (optional)
- low_stock_threshold (optional)
- unit (optional)
- sku (optional)

Return ONLY valid JSON, no markdown:
{{
  "mapping": {{
    "csv_column_name": "schema_field_name",
    "csv_column_name": "schema_field_name"
  }},
  "unmapped": ["column_name", "column_name"],
  "confidence": "high" or "medium" or "low",
  "warnings": ["warning message if any"]
}}

Rules:
- Map only columns you are confident about
- If a column could be selling price or cost price, prefer selling_price_ngn
- Ignore columns that clearly do not match any schema field
- Put unmatched columns in unmapped array
"""
    
    # AI Mapping with Retry Logic
    mapping_result = None
    last_error = None
    
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=settings.ai_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                )
            )
            text = response.text.strip()
            start = text.find("{")
            end = text.rfind("}") + 1
            mapping_result = json.loads(text[start:end])
            break
        except Exception as e:
            last_error = e
            if "quota" in str(e).lower() or "429" in str(e):
                await asyncio.sleep(attempt * 2 + 1)
                continue
            break

    if not mapping_result:
        raise HTTPException(
            status_code=500,
            detail=f"AI mapping failed: {str(last_error)}. Try the template format."
        )

    mapping = mapping_result.get("mapping", {})
    preview_rows = []
    errors = []

    for idx, row in df.iterrows():
        mapped_row = {}
        row_error = None

        for csv_col, schema_field in mapping.items():
            value = row.get(csv_col)
            if pd.isna(value):
                mapped_row[schema_field] = None
                continue

            if schema_field in ("selling_price_ngn", "cost_price_ngn"):
                try:
                    cleaned = str(value).replace(",", "").replace(
                        "NGN", "").replace("N", "").strip()
                    mapped_row[schema_field] = float(cleaned)
                except ValueError:
                    row_error = f"Row {idx + 2}: Could not read price value '{value}'"
                    mapped_row[schema_field] = None
            elif schema_field in ("stock_quantity", "low_stock_threshold"):
                try:
                    mapped_row[schema_field] = int(float(str(value)))
                except ValueError:
                    mapped_row[schema_field] = 0
            else:
                mapped_row[schema_field] = str(value).strip()

        if mapped_row.get("product_name") is None:
            row_error = f"Row {idx + 2}: Missing product name, skipping"
            errors.append(row_error)
            continue

        if mapped_row.get("selling_price_ngn") is None:
            row_error = f"Row {idx + 2}: Missing selling price, skipping"
            errors.append(row_error)
            continue

        if row_error:
            errors.append(row_error)

        preview_rows.append(mapped_row)

    return ApiResponse(data={
        "mapping": mapping,
        "unmapped_columns": mapping_result.get("unmapped", []),
        "confidence": mapping_result.get("confidence", "medium"),
        "warnings": mapping_result.get("warnings", []),
        "preview_rows": preview_rows[:10],
        "total_rows": len(preview_rows),
        "error_rows": len(errors),
        "errors": errors[:10],
        "import_token": _encode_import_data(preview_rows),
    })

@router.post("/import-csv/confirm")
async def confirm_csv_import(
    payload: dict,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
):
    import_token = payload.get("import_token")
    if not import_token:
        raise HTTPException(status_code=400, detail="Missing import token")

    try:
        rows = _decode_import_data(import_token)
    except Exception:
        raise HTTPException(status_code=400,
                            detail="Invalid import token. Re-upload your CSV.")

    created = 0
    failed = 0

    for row in rows:
        try:
            selling_price_kobo = round(
                float(row.get("selling_price_ngn") or 0) * 100
            )
            cost_price_kobo = round(
                float(row.get("cost_price_ngn") or 0) * 100
            )
            product = Product(
                id=uuid_lib.uuid4(),
                business_id=business.id,
                name=row.get("product_name", ""),
                category=row.get("category"),
                selling_price_kobo=selling_price_kobo,
                cost_price_kobo=cost_price_kobo,
                stock_quantity=int(row.get("stock_quantity") or 0),
                low_stock_threshold=int(row.get("low_stock_threshold") or 5),
                unit=row.get("unit") or "unit",
                sku=row.get("sku"),
                is_active=True,
            )
            db.add(product)
            created += 1
        except Exception as e:
            print(f"Failed to import row: {row}. Error: {str(e)}")
            failed += 1

    await db.commit()

    await log_action(
        db=db,
        user=current_user,
        action="product.bulk_imported",
        resource="product",
        detail=f"Imported {created} products via CSV, {failed} failed",
        ip_address=request.client.host if request else None,
    )

    return ApiResponse(
        data={"created": created, "failed": failed},
        message=f"{created} products imported successfully"
    )

@router.get("/csv-template")
async def download_csv_template(
    current_user: User = Depends(get_owner),
):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "product_name",
        "category",
        "selling_price_ngn",
        "cost_price_ngn",
        "stock_quantity",
        "low_stock_threshold",
        "unit",
        "sku",
    ])
    writer.writerow([
        "Milo 400g",
        "Beverages",
        "2200",
        "1800",
        "45",
        "5",
        "unit",
        "MLO-400",
    ])
    writer.writerow([
        "Indomie Chicken",
        "Noodles",
        "150",
        "120",
        "200",
        "10",
        "pack",
        "",
    ])
    output.seek(0)
    csv_content = output.getvalue()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=coreai_products_template.csv",
            "Content-Type": "text/csv; charset=utf-8",
        },
    )


@router.get("/{product_id}", response_model=ApiResponse[ProductResponse])
async def get_product(
    product_id: UUID,
    current_user: User = Depends(get_any_staff),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
            Product.deleted_at == None
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ApiResponse(data=map_product_response(product))

@router.patch("/{product_id}", response_model=ApiResponse[ProductResponse])
async def update_product(
    request: Request,
    product_id: UUID,
    body: ProductUpdate,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
            Product.deleted_at == None
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = body.dict(exclude_unset=True)
    
    price_changed = "selling_price_ngn" in update_data
    
    if "selling_price_ngn" in update_data:
        update_data["selling_price_kobo"] = to_kobo(update_data.pop("selling_price_ngn"))
    if "cost_price_ngn" in update_data:
        update_data["cost_price_kobo"] = to_kobo(update_data.pop("cost_price_ngn"))
        
    for key, value in update_data.items():
        setattr(product, key, value)
        
    await db.commit()
    await db.refresh(product)
    
    await log_action(
        db=db,
        user=current_user,
        action="product.price_changed" if price_changed else "product.updated",
        resource="product",
        resource_id=product.id,
        detail=f"Updated product: {product.name}",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data=map_product_response(product))

@router.delete("/{product_id}", response_model=ApiResponse[dict])
async def delete_product(
    request: Request,
    product_id: UUID,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
            Product.deleted_at == None
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.deleted_at = datetime.utcnow()
    await db.commit()
    
    await log_action(
        db=db,
        user=current_user,
        action="product.deleted",
        resource="product",
        resource_id=product.id,
        detail=f"Deleted product: {product.name}",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data={"id": product_id}, message="Product soft deleted")

@router.post("/{product_id}/adjust-stock", response_model=ApiResponse[ProductResponse])
async def adjust_stock(
    request: Request,
    product_id: UUID,
    body: StockAdjustmentRequest,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
            Product.deleted_at == None
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    new_quantity = product.stock_quantity + body.adjustment
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resulting stock cannot be negative"
        )
    
    product.stock_quantity = new_quantity
    await db.commit()
    await db.refresh(product)
    
    await log_action(
        db=db,
        user=current_user,
        action="product.stock_adjusted",
        resource="product",
        resource_id=product.id,
        detail=f"Adjusted stock for {product.name} by {body.adjustment}",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data=map_product_response(product))






def _encode_import_data(rows: list) -> str:
    data = json.dumps(rows)
    return base64.b64encode(data.encode()).decode()


def _decode_import_data(token: str) -> list:
    data = base64.b64decode(token.encode()).decode()
    return json.loads(data)
