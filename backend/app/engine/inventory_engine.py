from sqlalchemy.orm import Session
from app.models.models import Material, Supplier, InventoryRecord, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem, RiskAlert, Product, ProductMaterial, SupplierMaterial, Customer

def analyze_inventory_risks(db: Session, org_id: int) -> list[dict]:
    # Fetch all materials for the organization
    materials = db.query(Material).filter(Material.org_id == org_id).all()
    risks = []

    for material in materials:
        # Get current inventory
        inventory = db.query(InventoryRecord).filter(InventoryRecord.material_id == material.id).first()
        quantity = inventory.quantity if inventory else 0
        
        # Get avg daily usage
        avg_daily_usage = material.avg_daily_usage or 0
        
        if avg_daily_usage > 0:
            days_until_stockout = quantity / avg_daily_usage
        else:
            days_until_stockout = float('inf')
            
        # Get primary supplier's delivery days
        supplier_material = db.query(SupplierMaterial).filter(
            SupplierMaterial.material_id == material.id,
            SupplierMaterial.is_primary == True
        ).first()
        
        supplier_delivery_days = 0
        if supplier_material:
            supplier = db.query(Supplier).filter(Supplier.id == supplier_material.supplier_id).first()
            if supplier:
                supplier_delivery_days = supplier.avg_delivery_days or 14 # default
                
        severity = None
        score = 0
        if days_until_stockout < supplier_delivery_days:
            severity = "CRITICAL"
            score = 90
        elif days_until_stockout < supplier_delivery_days * 1.5:
            severity = "HIGH"
            score = 70
        elif quantity < (material.min_stock_level or 0):
            severity = "MEDIUM"
            score = 50
        elif quantity < (material.min_stock_level or 0) * 1.5:
            severity = "LOW"
            score = 30
            
        if severity:
            # Calculate financial impact (sales orders depending on this)
            financial_impact = 0.0 # simplified
            
            risk = {
                "material_id": material.id,
                "material_name": material.name,
                "current_qty": quantity,
                "avg_daily_usage": avg_daily_usage,
                "days_until_stockout": days_until_stockout,
                "supplier_delivery_days": supplier_delivery_days,
                "severity": severity,
                "score": score,
                "financial_impact": financial_impact,
                "recommendation": f"Reorder {material.name} immediately." if severity in ["CRITICAL", "HIGH"] else "Monitor stock."
            }
            risks.append(risk)
            
            # Upsert RiskAlert
            # In a real app we'd check if an alert already exists, here we just append
            
    return risks
