from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import User, Product, Material, Supplier, Customer, InventoryRecord, PurchaseOrder, SalesOrder, RiskAlert
from app.schemas.schemas import *
from app.auth import get_current_user
from app.engine.health_engine import calculate_health_score

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    products_count = db.query(func.count(Product.id)).filter(Product.org_id == current_user.org_id).scalar() or 0
    materials_count = db.query(func.count(Material.id)).filter(Material.org_id == current_user.org_id).scalar() or 0
    suppliers_count = db.query(func.count(Supplier.id)).filter(Supplier.org_id == current_user.org_id).scalar() or 0
    customers_count = db.query(func.count(Customer.id)).filter(Customer.org_id == current_user.org_id).scalar() or 0
    
    inventory_records = db.query(InventoryRecord).filter(InventoryRecord.org_id == current_user.org_id).all()
    total_inventory_value = sum((r.quantity * (r.unit_cost or 0.0)) for r in inventory_records)
    low_stock_count = sum(1 for r in inventory_records if r.quantity < (r.minimum_stock_level or 0))
    
    open_po_count = db.query(func.count(PurchaseOrder.id)).filter(
        PurchaseOrder.org_id == current_user.org_id, 
        PurchaseOrder.status.notin_(["delivered", "cancelled"])
    ).scalar() or 0
    
    open_so_count = db.query(func.count(SalesOrder.id)).filter(
        SalesOrder.org_id == current_user.org_id, 
        SalesOrder.status.notin_(["delivered", "cancelled"])
    ).scalar() or 0
    
    active_risks = db.query(func.count(RiskAlert.id)).filter(
        RiskAlert.org_id == current_user.org_id,
        RiskAlert.status == "active"
    ).scalar() or 0
    
    health_score = calculate_health_score(db, current_user.org_id)
    
    return {
        "products_count": products_count,
        "materials_count": materials_count,
        "suppliers_count": suppliers_count,
        "customers_count": customers_count,
        "total_inventory_value": total_inventory_value,
        "low_stock_count": low_stock_count,
        "open_po_count": open_po_count,
        "open_so_count": open_so_count,
        "active_risk_count": active_risks,
        "health_score": health_score.get("overall_score", 0)
    }

@router.get("/health-score")
def get_detailed_health_score(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return calculate_health_score(db, current_user.org_id)
