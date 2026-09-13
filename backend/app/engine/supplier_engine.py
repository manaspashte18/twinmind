from sqlalchemy.orm import Session
from datetime import datetime
from app.models.models import Supplier, PurchaseOrder, SupplierMaterial

def calculate_supplier_score(db: Session, supplier_id: int) -> dict:
    orders = db.query(PurchaseOrder).filter(
        PurchaseOrder.supplier_id == supplier_id,
        PurchaseOrder.status == 'delivered'
    ).all()
    
    total_orders = len(orders)
    if total_orders == 0:
        return {"on_time_rate": 0.85, "avg_delay": 5.0}
        
    on_time = 0
    total_delay = 0
    late_count = 0
    
    for order in orders:
        if order.actual_delivery_date and order.expected_delivery_date:
            if order.actual_delivery_date <= order.expected_delivery_date:
                on_time += 1
            else:
                delay = (order.actual_delivery_date - order.expected_delivery_date).days
                total_delay += max(0, delay)
                late_count += 1
                
    on_time_rate = round(on_time / total_orders, 2)
    avg_delay = round(total_delay / late_count, 1) if late_count > 0 else 0.0
    
    return {"on_time_rate": on_time_rate, "avg_delay": avg_delay}

def analyze_supplier_risks(db: Session, org_id: int) -> list[dict]:
    suppliers = db.query(Supplier).filter(Supplier.org_id == org_id).all()
    risks = []
    
    for supplier in suppliers:
        score_data = calculate_supplier_score(db, supplier.id)
        on_time_rate = score_data['on_time_rate']
        
        severity = None
        if on_time_rate < 0.70:
            severity = "HIGH"
        elif on_time_rate < 0.82:
            severity = "MEDIUM"
            
        supplier.on_time_delivery_rate = on_time_rate
        if score_data['avg_delay'] > 0:
            supplier.avg_delivery_days = score_data['avg_delay']
        
        if severity:
            risks.append({
                "supplier_id": supplier.id,
                "supplier_name": supplier.name,
                "on_time_rate": on_time_rate,
                "avg_delay": score_data['avg_delay'],
                "severity": severity
            })
            
    # Commit all supplier metrics updates once outside the loop
    db.commit()
    return risks
