from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from app.models.models import SalesOrder, Customer

def analyze_order_risks(db: Session, org_id: int) -> list[dict]:
    today = date.today()
    orders = db.query(SalesOrder).filter(
        SalesOrder.org_id == org_id,
        SalesOrder.status.in_(['pending', 'confirmed', 'in_production'])
    ).all()
    
    risks = []
    for order in orders:
        severity = None
        promised = order.promised_delivery_date

        if promised:
            days_remaining = (promised - today).days
            if days_remaining < 0:
                severity = "CRITICAL"
            elif days_remaining <= 5:
                severity = "HIGH"
            elif days_remaining <= 10:
                severity = "MEDIUM"
        else:
            if order.status == 'pending':
                severity = "MEDIUM"

        if severity:
            risks.append({
                "order_id": order.id,
                "so_number": order.so_number,
                "customer_id": order.customer_id,
                "severity": severity,
                "promised_delivery_date": str(promised) if promised else None,
                "revenue_at_risk": float(order.total_amount or 50000.0)
            })
            
    # Sort risks by highest revenue at risk and take top priority ones
    risks.sort(key=lambda x: x["revenue_at_risk"], reverse=True)
    return risks[:10]
