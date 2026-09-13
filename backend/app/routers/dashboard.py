from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any

from app.database import get_db
from app.models.models import (
    User, Product, Material, Supplier, Customer,
    InventoryRecord, PurchaseOrder, SalesOrder, RiskAlert
)
from app.schemas.schemas import HealthScore
from app.auth import get_current_user
from app.engine.health_engine import calculate_health_score

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    products_count = db.query(func.count(Product.id)).filter(Product.org_id == current_user.org_id).scalar() or 0
    materials_count = db.query(func.count(Material.id)).filter(Material.org_id == current_user.org_id).scalar() or 0
    suppliers_count = db.query(func.count(Supplier.id)).filter(Supplier.org_id == current_user.org_id).scalar() or 0
    customers_count = db.query(func.count(Customer.id)).filter(Customer.org_id == current_user.org_id).scalar() or 0

    inv_records = db.query(InventoryRecord, Material).join(
        Material, InventoryRecord.material_id == Material.id
    ).filter(InventoryRecord.org_id == current_user.org_id).all()

    total_inventory_value = sum((rec.quantity * mat.unit_cost) for rec, mat in inv_records)
    low_stock_count = sum(1 for rec, mat in inv_records if rec.quantity < mat.min_stock_level)

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

    health = calculate_health_score(db, current_user.org_id)

    return {
        "total_products": products_count,
        "total_materials": materials_count,
        "total_suppliers": suppliers_count,
        "total_customers": customers_count,
        "total_inventory_value": round(total_inventory_value, 2),
        "low_stock_count": low_stock_count,
        "open_purchase_orders": open_po_count,
        "open_sales_orders": open_so_count,
        "active_risks": active_risks,
        "health_score": health
    }

@router.get("/health-score")
def get_health_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return calculate_health_score(db, current_user.org_id)
