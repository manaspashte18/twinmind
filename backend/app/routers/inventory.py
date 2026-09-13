from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import User, InventoryRecord, Material
from app.schemas.schemas import *
from app.auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("/")
def list_inventory(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(InventoryRecord).filter(InventoryRecord.org_id == current_user.org_id).all()

@router.get("/low-stock")
def get_low_stock(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(InventoryRecord).filter(
        InventoryRecord.org_id == current_user.org_id,
        InventoryRecord.quantity < InventoryRecord.minimum_stock_level
    ).all()

@router.put("/{record_id}")
def update_inventory(record_id: int, inv_update: InventoryRecordUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(InventoryRecord).filter(InventoryRecord.id == record_id, InventoryRecord.org_id == current_user.org_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    for k, v in inv_update.dict(exclude_unset=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record

@router.get("/summary")
def get_inventory_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    records = db.query(InventoryRecord).filter(InventoryRecord.org_id == current_user.org_id).all()
    
    total_value = sum((r.quantity * (r.unit_cost or 0.0)) for r in records)
    items_count = len(records)
    low_stock_count = sum(1 for r in records if r.quantity < (r.minimum_stock_level or 0))
    out_of_stock_count = sum(1 for r in records if r.quantity <= 0)
    
    return {
        "total_value": total_value,
        "items_count": items_count,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count
    }
