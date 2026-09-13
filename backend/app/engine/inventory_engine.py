from sqlalchemy.orm import Session
from app.models.models import Material, Supplier, InventoryRecord, SupplierMaterial

def analyze_inventory_risks(db: Session, org_id: int) -> list[dict]:
    # Single batch query for all materials + inventory
    records = db.query(Material, InventoryRecord).outerjoin(
        InventoryRecord, InventoryRecord.material_id == Material.id
    ).filter(Material.org_id == org_id).all()

    # Pre-fetch suppliers and primary links in batch
    suppliers = {s.id: s for s in db.query(Supplier).filter(Supplier.org_id == org_id).all()}
    primary_links = {
        sm.material_id: sm.supplier_id 
        for sm in db.query(SupplierMaterial).filter(SupplierMaterial.is_primary == True).all()
    }

    risks = []
    for material, inventory in records:
        quantity = inventory.quantity if inventory else 0.0
        avg_daily_usage = material.avg_daily_usage or 0.0
        
        if avg_daily_usage > 0:
            days_until_stockout = quantity / avg_daily_usage
        else:
            days_until_stockout = 999.0

        supp_id = primary_links.get(material.id)
        supplier = suppliers.get(supp_id) if supp_id else None
        supplier_delivery_days = (supplier.avg_delivery_days if supplier else 7.0) or 7.0

        severity = None
        score = 0
        min_stock = material.min_stock_level or 0.0

        if days_until_stockout <= supplier_delivery_days:
            severity = "CRITICAL"
            score = 92
        elif days_until_stockout <= supplier_delivery_days * 1.5:
            severity = "HIGH"
            score = 75
        elif quantity <= min_stock:
            severity = "MEDIUM"
            score = 55
        elif quantity <= min_stock * 1.4:
            severity = "LOW"
            score = 35

        if severity:
            financial_impact = round(max(15000.0, quantity * material.unit_cost * 1.5), 2)
            risks.append({
                "material_id": material.id,
                "material_name": material.name,
                "current_qty": quantity,
                "avg_daily_usage": avg_daily_usage,
                "days_until_stockout": days_until_stockout,
                "supplier_delivery_days": supplier_delivery_days,
                "severity": severity,
                "score": score,
                "financial_impact": financial_impact,
                "recommendation": f"Issue urgent purchase order for {material.name} to prevent production stoppage."
            })

    return risks
