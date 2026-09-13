from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.models import Material, SupplierMaterial, Supplier, InventoryRecord, User
from app.schemas.schemas import MaterialResponse, MaterialCreate, MaterialUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/materials", tags=["Materials"])

@router.get("", response_model=List[MaterialResponse])
@router.get("/", response_model=List[MaterialResponse])
def get_materials(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Material).filter(
        Material.org_id == current_user.org_id
    ).offset(skip).limit(limit).all()

@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    data: MaterialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    material = Material(
        **data.model_dump(),
        org_id=current_user.org_id
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    # Automatically initialize an inventory record for this material
    inv = InventoryRecord(
        material_id=material.id,
        quantity=0.0,
        warehouse="main",
        org_id=current_user.org_id
    )
    db.add(inv)
    db.commit()

    return material

@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.org_id == current_user.org_id
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    data: MaterialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.org_id == current_user.org_id
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(material, key, value)
    db.commit()
    db.refresh(material)
    return material

@router.delete("/{material_id}")
def delete_material(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    material = db.query(Material).filter(
        Material.id == material_id,
        Material.org_id == current_user.org_id
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    db.query(InventoryRecord).filter(InventoryRecord.material_id == material_id).delete()
    db.query(SupplierMaterial).filter(SupplierMaterial.material_id == material_id).delete()
    db.delete(material)
    db.commit()
    return {"message": "Material deleted successfully"}

@router.get("/{material_id}/suppliers")
def get_material_suppliers(
    material_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    links = db.query(SupplierMaterial, Supplier).join(
        Supplier, SupplierMaterial.supplier_id == Supplier.id
    ).filter(
        SupplierMaterial.material_id == material_id,
        Supplier.org_id == current_user.org_id
    ).all()

    return [
        {
            "supplier_id": s.id,
            "supplier_name": s.name,
            "unit_price": sm.unit_price,
            "is_primary": sm.is_primary,
            "avg_delivery_days": s.avg_delivery_days,
            "on_time_delivery_rate": s.on_time_delivery_rate
        }
        for sm, s in links
    ]
