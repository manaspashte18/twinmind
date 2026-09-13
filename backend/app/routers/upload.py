import io
import asyncio
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import pandas as pd

from app.database import get_db
from app.models.models import (
    Material, Supplier, Customer, Product, InventoryRecord, 
    PurchaseOrder, SalesOrder, User
)
from app.auth import get_current_user
from app.schemas.schemas import UploadPreview

router = APIRouter(prefix="/upload", tags=["Upload"])

def _parse_file(content: bytes, filename: str) -> pd.DataFrame:
    buffer = io.BytesIO(content)
    if filename.endswith(".csv"):
        return pd.read_csv(buffer)
    elif filename.endswith((".xlsx", ".xls")):
        return pd.read_excel(buffer, engine="openpyxl")
    raise ValueError("Unsupported format")

@router.post("", response_model=UploadPreview)
@router.post("/", response_model=UploadPreview)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    filename = file.filename.lower()
    if not filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel (.xlsx, .xls) files are supported."
        )

    try:
        content = await file.read()
        df = await asyncio.to_thread(_parse_file, content, filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse file: {str(e)}"
        )
    finally:
        await file.close()

    total_rows = len(df)
    columns = [str(c) for c in df.columns]
    
    # Clean NaN values
    clean_df = df.where(pd.notnull(df), None)
    preview = clean_df.head(10).to_dict(orient="records")
    all_rows = clean_df.to_dict(orient="records")
    
    # Calculate basic data quality
    missing_cells = int(df.isnull().sum().sum())
    total_cells = int(df.size)
    quality_score = round(100.0 * (1 - (missing_cells / max(total_cells, 1))), 1)

    return {
        "filename": file.filename,
        "total_rows": total_rows,
        "columns": columns,
        "preview": preview,
        "rows": all_rows,
        "data_quality": {
            "score": quality_score,
            "missing_values": missing_cells,
            "duplicate_rows": int(df.duplicated().sum())
        }
    }

@router.post("/confirm")
def confirm_upload(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entity_type = data.get("entity_type")
    rows: List[Dict[str, Any]] = data.get("rows") or data.get("preview") or []
    mappings: Dict[str, str] = data.get("mappings") or data.get("column_mapping") or {}

    if not entity_type:
        raise HTTPException(status_code=400, detail="entity_type is required")
    if not rows:
        raise HTTPException(status_code=400, detail="No rows provided for import")

    inserted_count = 0
    errors = []

    for i, row in enumerate(rows):
        try:
            mapped_row = {}
            if mappings:
                for file_col, model_field in mappings.items():
                    if file_col in row and model_field:
                        mapped_row[model_field] = row[file_col]

            for k, v in row.items():
                clean_k = str(k).strip().lower().replace(" ", "_")
                if clean_k not in mapped_row and v is not None:
                    mapped_row[clean_k] = v
                if str(k) not in mapped_row and v is not None:
                    mapped_row[str(k)] = v

            if entity_type == "materials":
                mat = Material(
                    name=str(mapped_row.get("name") or mapped_row.get("material_name") or f"Material-{i+1}"),
                    code=str(mapped_row.get("code") or mapped_row.get("material_code") or f"MAT-{i+100}"),
                    unit=str(mapped_row.get("unit") or "units"),
                    unit_cost=float(mapped_row.get("unit_cost") or mapped_row.get("cost") or mapped_row.get("price") or 0.0),
                    min_stock_level=float(mapped_row.get("min_stock_level") or mapped_row.get("min_stock") or 0.0),
                    avg_daily_usage=float(mapped_row.get("avg_daily_usage") or mapped_row.get("daily_usage") or 0.0),
                    org_id=current_user.org_id
                )
                db.add(mat)
                db.flush()
                init_qty = float(mapped_row.get("quantity") or mapped_row.get("initial_stock") or mapped_row.get("stock") or 0.0)
                inv = InventoryRecord(
                    material_id=mat.id,
                    quantity=init_qty,
                    warehouse=str(mapped_row.get("warehouse") or "main"),
                    org_id=current_user.org_id
                )
                db.add(inv)

            elif entity_type == "suppliers":
                sup = Supplier(
                    name=str(mapped_row.get("name") or mapped_row.get("supplier_name") or f"Supplier-{i+1}"),
                    contact_email=mapped_row.get("contact_email") or mapped_row.get("email"),
                    contact_phone=mapped_row.get("contact_phone") or mapped_row.get("phone"),
                    address=mapped_row.get("address"),
                    avg_delivery_days=float(mapped_row.get("avg_delivery_days") or mapped_row.get("lead_time") or 7.0),
                    on_time_delivery_rate=float(mapped_row.get("on_time_delivery_rate") or mapped_row.get("reliability") or 1.0),
                    org_id=current_user.org_id
                )
                db.add(sup)

            elif entity_type == "products":
                prd = Product(
                    name=str(mapped_row.get("name") or mapped_row.get("product_name") or f"Product-{i+1}"),
                    sku=str(mapped_row.get("sku") or mapped_row.get("product_code") or f"SKU-{i+100}"),
                    unit_price=float(mapped_row.get("unit_price") or mapped_row.get("price") or 0.0),
                    category=mapped_row.get("category") or "Components",
                    org_id=current_user.org_id
                )
                db.add(prd)

            elif entity_type == "customers":
                cust = Customer(
                    name=str(mapped_row.get("name") or mapped_row.get("customer_name") or f"Customer-{i+1}"),
                    contact_email=mapped_row.get("contact_email") or mapped_row.get("email"),
                    contact_phone=mapped_row.get("contact_phone") or mapped_row.get("phone"),
                    priority=str(mapped_row.get("priority") or "normal").lower(),
                    org_id=current_user.org_id
                )
                db.add(cust)

            elif entity_type == "inventory":
                mat_id = mapped_row.get("material_id")
                if not mat_id:
                    mat_code = mapped_row.get("material_code") or mapped_row.get("code")
                    if mat_code:
                        m = db.query(Material).filter(Material.org_id == current_user.org_id, Material.code == str(mat_code)).first()
                        if m:
                            mat_id = m.id
                if not mat_id:
                    m = db.query(Material).filter(Material.org_id == current_user.org_id).first()
                    if m:
                        mat_id = m.id

                if mat_id:
                    inv = InventoryRecord(
                        material_id=int(mat_id),
                        quantity=float(mapped_row.get("quantity") or 0.0),
                        warehouse=str(mapped_row.get("warehouse") or "main"),
                        org_id=current_user.org_id
                    )
                    db.add(inv)

            elif entity_type == "purchase_orders":
                po = PurchaseOrder(
                    po_number=str(mapped_row.get("po_number") or f"PO-{i+1000}"),
                    supplier_id=int(mapped_row.get("supplier_id") or 1),
                    order_date=date.today(),
                    total_amount=float(mapped_row.get("total_amount") or mapped_row.get("amount") or 0.0),
                    status=str(mapped_row.get("status") or "ordered"),
                    org_id=current_user.org_id
                )
                db.add(po)

            elif entity_type == "sales_orders":
                so = SalesOrder(
                    so_number=str(mapped_row.get("so_number") or f"SO-{i+1000}"),
                    customer_id=int(mapped_row.get("customer_id") or 1),
                    order_date=date.today(),
                    total_amount=float(mapped_row.get("total_amount") or mapped_row.get("amount") or 0.0),
                    status=str(mapped_row.get("status") or "confirmed"),
                    org_id=current_user.org_id
                )
                db.add(so)

            inserted_count += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    db.commit()
    return {
        "status": "success",
        "inserted_count": inserted_count,
        "errors_count": len(errors),
        "errors": errors[:5]
    }
