from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
import io
import csv
from datetime import datetime, date
from typing import Optional

from app.database import get_db
from app.models.models import (
    User, Material, Supplier, InventoryRecord, 
    PurchaseOrder, SalesOrder, Product, Customer, RiskAlert
)
from app.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/daily")
def get_daily_report(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.org_id
    
    # Live summary calculations
    total_materials = db.query(Material).filter(Material.org_id == org_id).count()
    total_suppliers = db.query(Supplier).filter(Supplier.org_id == org_id).count()
    total_products = db.query(Product).filter(Product.org_id == org_id).count()
    total_customers = db.query(Customer).filter(Customer.org_id == org_id).count()
    
    inv_records = db.query(InventoryRecord, Material).join(
        Material, InventoryRecord.material_id == Material.id
    ).filter(InventoryRecord.org_id == org_id).all()
    
    total_inventory_val = sum((inv.quantity * mat.unit_cost) for inv, mat in inv_records)
    low_stock_count = sum(1 for inv, mat in inv_records if inv.quantity <= mat.min_stock_level)
    
    open_po_count = db.query(PurchaseOrder).filter(
        PurchaseOrder.org_id == org_id, 
        PurchaseOrder.status.in_(["pending", "ordered", "shipped"])
    ).count()
    
    open_so_count = db.query(SalesOrder).filter(
        SalesOrder.org_id == org_id,
        SalesOrder.status.in_(["pending", "confirmed", "in_production"])
    ).count()
    
    active_risks = db.query(RiskAlert).filter(
        RiskAlert.org_id == org_id,
        RiskAlert.status == "active"
    ).all()
    critical_risks = sum(1 for r in active_risks if r.severity == "critical")
    
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "inventory": f"{total_materials} tracked materials, {low_stock_count} low/critical stock items. Valuation: ${total_inventory_val:,.2f}",
        "suppliers": f"{total_suppliers} active suppliers with {open_po_count} active purchase orders in pipeline.",
        "orders": f"{open_so_count} open customer orders requiring manufacturing fulfillment.",
        "risks": f"{len(active_risks)} active alerts ({critical_risks} critical severity needing immediate mitigation).",
        "metrics": {
            "materials_count": total_materials,
            "suppliers_count": total_suppliers,
            "products_count": total_products,
            "customers_count": total_customers,
            "inventory_valuation": round(total_inventory_val, 2),
            "low_stock_items": low_stock_count,
            "open_purchase_orders": open_po_count,
            "open_sales_orders": open_so_count,
            "active_risks": len(active_risks)
        }
    }

@router.get("/export")
def export_data(
    entity_type: Optional[str] = Query(None, description="materials|products|suppliers|customers|inventory|purchase_orders|sales_orders|risks|daily_summary"),
    entity: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    target = (entity_type or entity or "").lower().strip()
    org_id = current_user.org_id
    output = io.StringIO()

    if not target:
        raise HTTPException(status_code=400, detail="entity_type or entity query parameter is required")

    # 1. Specialized enriched exports
    if target == "inventory":
        inv_records = db.query(InventoryRecord, Material).join(
            Material, InventoryRecord.material_id == Material.id
        ).filter(InventoryRecord.org_id == org_id).all()

        columns = [
            "id", "material_code", "material_name", "quantity", "unit", 
            "unit_cost", "total_valuation", "min_stock_level", "avg_daily_usage", 
            "warehouse", "stock_status", "last_updated"
        ]
        writer = csv.DictWriter(output, fieldnames=columns)
        writer.writeheader()
        for inv, mat in inv_records:
            status = "CRITICAL" if inv.quantity <= mat.min_stock_level else (
                "LOW" if inv.quantity <= mat.min_stock_level * 1.5 else "HEALTHY"
            )
            writer.writerow({
                "id": inv.id,
                "material_code": mat.code,
                "material_name": mat.name,
                "quantity": inv.quantity,
                "unit": mat.unit,
                "unit_cost": mat.unit_cost,
                "total_valuation": round(inv.quantity * mat.unit_cost, 2),
                "min_stock_level": mat.min_stock_level,
                "avg_daily_usage": mat.avg_daily_usage,
                "warehouse": inv.warehouse,
                "stock_status": status,
                "last_updated": inv.last_updated.isoformat() if inv.last_updated else ""
            })

    elif target in ["purchase_orders", "purchase-orders"]:
        orders = db.query(PurchaseOrder, Supplier).outerjoin(
            Supplier, PurchaseOrder.supplier_id == Supplier.id
        ).filter(PurchaseOrder.org_id == org_id).all()

        columns = [
            "id", "po_number", "supplier_name", "status", "order_date", 
            "expected_delivery_date", "actual_delivery_date", "total_amount", "created_at"
        ]
        writer = csv.DictWriter(output, fieldnames=columns)
        writer.writeheader()
        for po, supp in orders:
            writer.writerow({
                "id": po.id,
                "po_number": po.po_number,
                "supplier_name": supp.name if supp else f"Supplier #{po.supplier_id}",
                "status": po.status,
                "order_date": str(po.order_date) if po.order_date else "",
                "expected_delivery_date": str(po.expected_delivery_date) if po.expected_delivery_date else "",
                "actual_delivery_date": str(po.actual_delivery_date) if po.actual_delivery_date else "",
                "total_amount": po.total_amount,
                "created_at": po.created_at.isoformat() if po.created_at else ""
            })

    elif target in ["sales_orders", "sales-orders"]:
        orders = db.query(SalesOrder, Customer).outerjoin(
            Customer, SalesOrder.customer_id == Customer.id
        ).filter(SalesOrder.org_id == org_id).all()

        columns = [
            "id", "so_number", "customer_name", "status", "order_date", 
            "promised_delivery_date", "actual_delivery_date", "total_amount", "created_at"
        ]
        writer = csv.DictWriter(output, fieldnames=columns)
        writer.writeheader()
        for so, cust in orders:
            writer.writerow({
                "id": so.id,
                "so_number": so.so_number,
                "customer_name": cust.name if cust else f"Customer #{so.customer_id}",
                "status": so.status,
                "order_date": str(so.order_date) if so.order_date else "",
                "promised_delivery_date": str(so.promised_delivery_date) if so.promised_delivery_date else "",
                "actual_delivery_date": str(so.actual_delivery_date) if so.actual_delivery_date else "",
                "total_amount": so.total_amount,
                "created_at": so.created_at.isoformat() if so.created_at else ""
            })

    elif target in ["risks", "risk_alerts", "risk-alerts"]:
        risks = db.query(RiskAlert).filter(RiskAlert.org_id == org_id).all()
        columns = [
            "id", "risk_type", "severity", "score", "entity_type", "title", 
            "description", "financial_impact", "status", "created_at"
        ]
        writer = csv.DictWriter(output, fieldnames=columns)
        writer.writeheader()
        for r in risks:
            writer.writerow({
                "id": r.id,
                "risk_type": r.risk_type,
                "severity": r.severity,
                "score": r.score,
                "entity_type": r.entity_type,
                "title": r.title,
                "description": r.description,
                "financial_impact": r.financial_impact if r.financial_impact else 0.0,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else ""
            })

    elif target in ["daily_summary", "daily-summary", "executive_report"]:
        # Multi-section executive summary
        writer = csv.writer(output)
        writer.writerow(["TwinMind Executive Daily Operations Report"])
        writer.writerow([f"Generated At: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"])
        writer.writerow([])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Raw Materials", db.query(Material).filter(Material.org_id == org_id).count()])
        writer.writerow(["Total Catalog Products", db.query(Product).filter(Product.org_id == org_id).count()])
        writer.writerow(["Active Suppliers", db.query(Supplier).filter(Supplier.org_id == org_id).count()])
        writer.writerow(["Enterprise Customers", db.query(Customer).filter(Customer.org_id == org_id).count()])
        
        inv_records = db.query(InventoryRecord, Material).join(
            Material, InventoryRecord.material_id == Material.id
        ).filter(InventoryRecord.org_id == org_id).all()
        val = sum((i.quantity * m.unit_cost) for i, m in inv_records)
        low = sum(1 for i, m in inv_records if i.quantity <= m.min_stock_level)
        writer.writerow(["Total Inventory Value ($)", f"{val:,.2f}"])
        writer.writerow(["Critical Low Stock Materials", low])
        writer.writerow(["Active Supply Chain Risk Alerts", db.query(RiskAlert).filter(RiskAlert.org_id == org_id, RiskAlert.status == "active").count()])

    else:
        # Standard entity table mapping
        entity_map = {
            "materials": Material,
            "products": Product,
            "suppliers": Supplier,
            "customers": Customer
        }
        ModelClass = entity_map.get(target)
        if not ModelClass:
            raise HTTPException(status_code=400, detail=f"Unsupported export entity: {target}")
            
        records = db.query(ModelClass).filter(ModelClass.org_id == org_id).all()
        columns = [c.name for c in ModelClass.__table__.columns if c.name != "password_hash"]
        writer = csv.DictWriter(output, fieldnames=columns)
        writer.writeheader()
        for record in records:
            row = {
                c: (getattr(record, c).isoformat() if isinstance(getattr(record, c), (datetime, date)) else getattr(record, c))
                for c in columns
            }
            writer.writerow(row)

    csv_data = output.getvalue()
    filename = f"{target}_export_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
