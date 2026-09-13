import io
import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import pandas as pd

from app.database import get_db
from app.models.models import Material, Supplier, Customer, Product, InventoryRecord, User
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
    
    # Calculate basic data quality
    missing_cells = int(df.isnull().sum().sum())
    total_cells = int(df.size)
    quality_score = round(100.0 * (1 - (missing_cells / max(total_cells, 1))), 1)

    return {
        "filename": file.filename,
        "total_rows": total_rows,
        "columns": columns,
        "preview": preview,
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
    rows: List[Dict[str, Any]] = data.get("rows", [])
    mappings: Dict[str, str] = data.get("mappings", {})

    if not entity_type or not rows:
        raise HTTPException(status_code=400, detail="entity_type and rows are required")

    inserted_count = 0
    errors = []

    for i, row in enumerate(rows):
        try:
            mapped_row = {
                model_field: row.get(file_col)
                for file_col, model_field in mappings.items()
                if file_col in row and model_field
            }

            if entity_type == "materials":
                mat = Material(
                    name=str(mapped_row.get("name", f"Material-{i}")),
                    code=str(mapped_row.get("code", f"MAT-{i+100}")),
                    unit=str(mapped_row.get("unit", "units")),
                    unit_cost=float(mapped_row.get("unit_cost", 0.0)),
                    min_stock_level=float(mapped_row.get("min_stock_level", 0.0)),
                    avg_daily_usage=float(mapped_row.get("avg_daily_usage", 0.0)),
                    org_id=current_user.org_id
                )
                db.add(mat)
                db.flush()
                inv = InventoryRecord(
                    material_id=mat.id,
                    quantity=float(mapped_row.get("initial_stock", 0.0)),
                    org_id=current_user.org_id
                )
                db.add(inv)

            elif entity_type == "suppliers":
                sup = Supplier(
                    name=str(mapped_row.get("name", f"Supplier-{i}")),
                    contact_email=mapped_row.get("contact_email"),
                    contact_phone=mapped_row.get("contact_phone"),
                    avg_delivery_days=float(mapped_row.get("avg_delivery_days", 7.0)),
                    on_time_delivery_rate=float(mapped_row.get("on_time_delivery_rate", 1.0)),
                    org_id=current_user.org_id
                )
                db.add(sup)

            elif entity_type == "products":
                prd = Product(
                    name=str(mapped_row.get("name", f"Product-{i}")),
                    sku=str(mapped_row.get("sku", f"SKU-{i+100}")),
                    unit_price=float(mapped_row.get("unit_price", 0.0)),
                    category=mapped_row.get("category"),
                    org_id=current_user.org_id
                )
                db.add(prd)

            elif entity_type == "customers":
                cust = Customer(
                    name=str(mapped_row.get("name", f"Customer-{i}")),
                    contact_email=mapped_row.get("contact_email"),
                    priority=mapped_row.get("priority", "normal"),
                    org_id=current_user.org_id
                )
                db.add(cust)

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
