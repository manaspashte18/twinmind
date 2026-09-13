from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.models.models import Supplier, SupplierMaterial, Material, PurchaseOrder, User
from app.schemas.schemas import SupplierResponse, SupplierCreate, SupplierUpdate
from app.auth import get_current_user
from app.engine.risk_service import run_risk_detection

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=List[SupplierResponse])
@router.get("/", response_model=List[SupplierResponse])
def get_suppliers(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Supplier).filter(
        Supplier.org_id == current_user.org_id
    ).offset(skip).limit(limit).all()

@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    supplier = Supplier(
        **data.model_dump(),
        org_id=current_user.org_id
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.org_id == current_user.org_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier

@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.org_id == current_user.org_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, key, value)
    db.commit()
    db.refresh(supplier)

    try:
        run_risk_detection(db, current_user.org_id)
    except Exception as e:
        print(f"Warning: automatic risk detection failed: {e}")

    return supplier

@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.org_id == current_user.org_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    db.query(SupplierMaterial).filter(SupplierMaterial.supplier_id == supplier_id).delete()
    db.delete(supplier)
    db.commit()
    return {"message": "Supplier deleted successfully"}

@router.get("/{supplier_id}/performance")
def get_supplier_performance(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.org_id == current_user.org_id
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.supplier_id == supplier_id,
        PurchaseOrder.org_id == current_user.org_id
    ).all()
    
    total_orders = len(pos)
    delivered_orders = [p for p in pos if p.status == "delivered"]
    
    delays = []
    for p in delivered_orders:
        if p.expected_delivery_date and p.actual_delivery_date:
            delay = (p.actual_delivery_date - p.expected_delivery_date).days
            if delay > 0:
                delays.append(delay)
    
    avg_delay_days = round(sum(delays) / len(delays), 1) if delays else 0.0

    return {
        "supplier_id": supplier.id,
        "name": supplier.name,
        "total_orders": total_orders,
        "delivered_orders": len(delivered_orders),
        "on_time_delivery_rate": supplier.on_time_delivery_rate,
        "avg_delivery_days": supplier.avg_delivery_days,
        "avg_delay_days_when_late": avg_delay_days,
        "reliability_score": round(supplier.on_time_delivery_rate * 100, 1)
    }

@router.get("/{supplier_id}/materials")
def get_supplier_materials(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    links = db.query(SupplierMaterial, Material).join(
        Material, SupplierMaterial.material_id == Material.id
    ).filter(
        SupplierMaterial.supplier_id == supplier_id
    ).all()

    return [
        {
            "material_id": m.id,
            "material_name": m.name,
            "material_code": m.code,
            "unit_price": sm.unit_price,
            "is_primary": sm.is_primary
        }
        for sm, m in links
    ]
