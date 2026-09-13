from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.models.models import User, InventoryRecord, Material
from app.schemas.schemas import InventoryRecordUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("")
@router.get("/")
def list_inventory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = db.query(InventoryRecord, Material).join(
        Material, InventoryRecord.material_id == Material.id
    ).filter(InventoryRecord.org_id == current_user.org_id).all()

    items = []
    for inv, mat in results:
        items.append({
            "id": inv.id,
            "material_id": inv.material_id,
            "quantity": inv.quantity,
            "warehouse": inv.warehouse,
            "last_updated": inv.last_updated.isoformat() if inv.last_updated else None,
            "org_id": inv.org_id,
            "material": {
                "id": mat.id,
                "name": mat.name,
                "code": mat.code,
                "unit": mat.unit,
                "unit_cost": mat.unit_cost,
                "min_stock_level": mat.min_stock_level,
                "avg_daily_usage": mat.avg_daily_usage,
                "org_id": mat.org_id
            }
        })
    return items

@router.get("/low-stock")
def get_low_stock(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = db.query(InventoryRecord, Material).join(
        Material, InventoryRecord.material_id == Material.id
    ).filter(
        InventoryRecord.org_id == current_user.org_id,
        InventoryRecord.quantity < Material.min_stock_level
    ).all()

    items = []
    for inv, mat in results:
        items.append({
            "id": inv.id,
            "material_id": inv.material_id,
            "quantity": inv.quantity,
            "warehouse": inv.warehouse,
            "last_updated": inv.last_updated.isoformat() if inv.last_updated else None,
            "org_id": inv.org_id,
            "material": {
                "id": mat.id,
                "name": mat.name,
                "code": mat.code,
                "unit": mat.unit,
                "unit_cost": mat.unit_cost,
                "min_stock_level": mat.min_stock_level,
                "avg_daily_usage": mat.avg_daily_usage,
                "org_id": mat.org_id
            }
        })
    return items

@router.put("/{record_id}")
def update_inventory(
    record_id: int,
    inv_update: InventoryRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = db.query(InventoryRecord).filter(
        InventoryRecord.id == record_id,
        InventoryRecord.org_id == current_user.org_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    
    for k, v in inv_update.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record

@router.get("/summary")
def get_inventory_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = db.query(InventoryRecord, Material).join(
        Material, InventoryRecord.material_id == Material.id
    ).filter(InventoryRecord.org_id == current_user.org_id).all()

    total_value = sum((inv.quantity * mat.unit_cost) for inv, mat in results)
    items_count = len(results)
    low_stock_count = sum(1 for inv, mat in results if inv.quantity < mat.min_stock_level)
    out_of_stock_count = sum(1 for inv, mat in results if inv.quantity <= 0)

    return {
        "total_value": round(total_value, 2),
        "items_count": items_count,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count
    }
