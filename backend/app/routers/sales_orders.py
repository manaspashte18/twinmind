from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.models import User, SalesOrder, SalesOrderItem
from app.schemas.schemas import *
from app.auth import get_current_user

router = APIRouter(prefix="/sales-orders", tags=["sales_orders"])

@router.get("/")
def list_sales_orders(
    status: Optional[str] = None, 
    customer_id: Optional[int] = None, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(SalesOrder).filter(SalesOrder.org_id == current_user.org_id)
    if status:
        query = query.filter(SalesOrder.status == status)
    if customer_id:
        query = query.filter(SalesOrder.customer_id == customer_id)
    return query.all()

@router.post("/")
def create_sales_order(so: SalesOrderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    so_data = so.dict(exclude={"items"})
    db_so = SalesOrder(**so_data, org_id=current_user.org_id)
    db.add(db_so)
    db.commit()
    db.refresh(db_so)
    
    for item in so.items:
        db_item = SalesOrderItem(**item.dict(), sales_order_id=db_so.id)
        db.add(db_item)
    
    db.commit()
    db.refresh(db_so)
    return db_so

@router.get("/{so_id}")
def get_sales_order(so_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id, SalesOrder.org_id == current_user.org_id).first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales order not found")
    items = db.query(SalesOrderItem).filter(SalesOrderItem.sales_order_id == so_id).all()
    return {"sales_order": so, "items": items}

@router.put("/{so_id}")
def update_sales_order(so_id: int, so_update: SalesOrderUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    so = db.query(SalesOrder).filter(SalesOrder.id == so_id, SalesOrder.org_id == current_user.org_id).first()
    if not so:
        raise HTTPException(status_code=404, detail="Sales order not found")
    for k, v in so_update.dict(exclude_unset=True).items():
        setattr(so, k, v)
    db.commit()
    db.refresh(so)
    return so
