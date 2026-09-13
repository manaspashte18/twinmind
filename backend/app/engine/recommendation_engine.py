from sqlalchemy.orm import Session

def generate_recommendations(db: Session, org_id: int, risk_alert_id: int = None) -> list[dict]:
    # Simplified recommendations
    return [
        {
            "title": "Order from backup supplier",
            "description": "Place an expedited order with backup supplier",
            "estimated_cost": 500.0,
            "expected_delay_days": 2,
            "risk_level": "low",
            "affected_orders": 1,
            "confidence": 0.85
        }
    ]
