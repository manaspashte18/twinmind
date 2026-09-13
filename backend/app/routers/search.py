from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any

from app.database import get_db
from app.models.models import (
    User, Material, Product, Supplier, Customer,
    PurchaseOrder, SalesOrder, RiskAlert
)
from app.auth import get_current_user

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("")
@router.get("/")
def search_entities(
    q: str = Query("", description="Universal search term"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    term = q.strip()
    if not term:
        return {"query": "", "total": 0, "results": []}

    pattern = f"%{term}%"
    org_id = current_user.org_id
    items = []

    # 1. Materials
    materials = db.query(Material).filter(
        Material.org_id == org_id,
        or_(Material.name.ilike(pattern), Material.code.ilike(pattern))
    ).limit(6).all()

    for m in materials:
        items.append({
            "id": m.id,
            "type": "material",
            "category": "Raw Materials",
            "title": m.name,
            "subtitle": f"Code: {m.code} • ${m.unit_cost}/{m.unit}",
            "url": "/inventory"
        })

    # 2. Products
    products = db.query(Product).filter(
        Product.org_id == org_id,
        or_(Product.name.ilike(pattern), Product.sku.ilike(pattern))
    ).limit(6).all()

    for p in products:
        items.append({
            "id": p.id,
            "type": "product",
            "category": "Catalog Products",
            "title": p.name,
            "subtitle": f"SKU: {p.sku} • Price: ${p.unit_price:,.2f}",
            "url": "/products"
        })

    # 3. Suppliers
    suppliers = db.query(Supplier).filter(
        Supplier.org_id == org_id,
        Supplier.name.ilike(pattern)
    ).limit(6).all()

    for s in suppliers:
        items.append({
            "id": s.id,
            "type": "supplier",
            "category": "Suppliers",
            "title": s.name,
            "subtitle": f"Lead Time: {s.avg_delivery_days}d • On-Time: {round((s.on_time_delivery_rate or 1.0) * 100)}%",
            "url": "/suppliers"
        })

    # 4. Customers
    customers = db.query(Customer).filter(
        Customer.org_id == org_id,
        Customer.name.ilike(pattern)
    ).limit(6).all()

    for c in customers:
        items.append({
            "id": c.id,
            "type": "customer",
            "category": "Customers",
            "title": c.name,
            "subtitle": f"Priority: {c.priority.upper()}",
            "url": "/customers"
        })

    # 5. Purchase Orders
    pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.org_id == org_id,
        PurchaseOrder.po_number.ilike(pattern)
    ).limit(6).all()

    for po in pos:
        items.append({
            "id": po.id,
            "type": "order",
            "category": "Purchase Orders",
            "title": po.po_number,
            "subtitle": f"Status: {po.status} • Total: ${po.total_amount:,.2f}",
            "url": "/purchase-orders"
        })

    # 6. Sales Orders
    sos = db.query(SalesOrder).filter(
        SalesOrder.org_id == org_id,
        SalesOrder.so_number.ilike(pattern)
    ).limit(6).all()

    for so in sos:
        items.append({
            "id": so.id,
            "type": "order",
            "category": "Sales Orders",
            "title": so.so_number,
            "subtitle": f"Status: {so.status} • Total: ${so.total_amount:,.2f}",
            "url": "/sales-orders"
        })

    # 7. Risk Alerts
    risks = db.query(RiskAlert).filter(
        RiskAlert.org_id == org_id,
        or_(RiskAlert.title.ilike(pattern), RiskAlert.description.ilike(pattern))
    ).limit(6).all()

    for r in risks:
        items.append({
            "id": r.id,
            "type": "risk",
            "category": "Risk Alerts",
            "title": r.title,
            "subtitle": f"Severity: {r.severity.upper()} • Status: {r.status}",
            "url": "/risks"
        })

    return {
        "query": term,
        "total": len(items),
        "results": items
    }
