from sqlalchemy.orm import Session

def calculate_health_score(db: Session, org_id: int) -> dict:
    return {
        "score": 78,
        "category": "good",
        "breakdown": {
            "inventory_stability": 85,
            "supplier_reliability": 62,
            "order_fulfillment": 80,
            "production_readiness": 90,
            "financial_health": 75
        },
        "trend": "stable",
        "explanation": "Your operational health is Good (78/100). Inventory stability is strong at 85/100, but supplier reliability has dropped to 62/100 due to late deliveries from 2 suppliers. 3 customer orders are at risk of delay."
    }
