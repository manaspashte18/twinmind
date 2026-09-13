from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.database import get_db
from app.models.models import User, PurchaseOrder, PurchaseOrderItem, InventoryRecord
from app.schemas.schemas import *
from app.auth import get_current_user
from app.engine.risk_service import run_risk_detection

router = APIRouter(prefix="/purchase-orders", tags=["purchase_orders"])

@router.get("")
@router.get("/")
def list_purchase_orders(
    status: Optional[str] = None, 
    supplier_id: Optional[int] = None, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(PurchaseOrder).filter(PurchaseOrder.org_id == current_user.org_id)
    if status:
        query = query.filter(PurchaseOrder.status == status)
    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)
    return query.all()

@router.post("")
@router.post("/")
def create_purchase_order(po: PurchaseOrderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    po_data = po.model_dump(exclude={"items"})
    db_po = PurchaseOrder(**po_data, org_id=current_user.org_id)
    db.add(db_po)
    db.commit()
    db.refresh(db_po)
    
    if po.items:
        for item in po.items:
            item_dict = item if isinstance(item, dict) else item.model_dump()
            db_item = PurchaseOrderItem(
                purchase_order_id=db_po.id,
                material_id=item_dict.get("material_id"),
                quantity=item_dict.get("quantity", 0),
                unit_price=item_dict.get("unit_price", 0)
            )
            db.add(db_item)
        db.commit()
        db.refresh(db_po)

    try:
        run_risk_detection(db, current_user.org_id)
    except Exception as e:
        print(f"Warning: automatic risk detection failed: {e}")

    return db_po

@router.get("/{po_id}")
def get_purchase_order(po_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == current_user.org_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.purchase_order_id == po_id).all()
    return {"purchase_order": po, "items": items}

@router.put("/{po_id}")
def update_purchase_order(po_id: int, po_update: PurchaseOrderUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == current_user.org_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    for k, v in po_update.dict(exclude_unset=True).items():
        setattr(po, k, v)
    db.commit()
    db.refresh(po)

    try:
        run_risk_detection(db, current_user.org_id)
    except Exception as e:
        print(f"Warning: automatic risk detection failed: {e}")

    return po

@router.put("/{po_id}/receive")
def receive_purchase_order(po_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == current_user.org_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if po.status == "delivered":
        raise HTTPException(status_code=400, detail="PO already delivered")
        
    po.status = "delivered"
    po.actual_delivery_date = datetime.utcnow()
    
    items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.purchase_order_id == po_id).all()
    for item in items:
        # Update inventory
        inv = db.query(InventoryRecord).filter(
            InventoryRecord.material_id == item.material_id, 
            InventoryRecord.org_id == current_user.org_id
        ).first()
        if inv:
            inv.quantity += item.quantity
        else:
            new_inv = InventoryRecord(
                material_id=item.material_id,
                org_id=current_user.org_id,
                quantity=item.quantity,
                location="Main Warehouse"
            )
            db.add(new_inv)
            
    db.commit()
    db.refresh(po)

    try:
        run_risk_detection(db, current_user.org_id)
    except Exception as e:
        print(f"Warning: automatic risk detection failed: {e}")

    return po
