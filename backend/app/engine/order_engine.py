from sqlalchemy.orm import Session
from datetime import datetime
from app.models.models import SalesOrder

def analyze_order_risks(db: Session, org_id: int) -> list[dict]:
    # Simplified version for now
    orders = db.query(SalesOrder).filter(
        SalesOrder.org_id == org_id,
        SalesOrder.status.in_(['pending', 'confirmed'])
    ).all()
    
    risks = []
    for order in orders:
        # Complex calculation would go here to determine if order is at risk
        # This involves traversing BOM and checking inventory
        severity = "LOW"
        if severity in ["CRITICAL", "HIGH", "MEDIUM"]:
            risks.append({
                "order_id": order.id,
                "so_number": order.so_number,
                "severity": severity,
                "revenue_at_risk": float(order.total_amount or 0)
            })
            
    return risks
