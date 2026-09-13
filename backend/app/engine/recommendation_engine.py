from sqlalchemy.orm import Session
from app.models.models import RiskAlert
from typing import List, Dict, Any, Optional

def generate_recommendations(db: Session, org_id: int, risk_alert_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Generates actionable options for risk alerts based on operational trade-offs.
    """
    alert = None
    if risk_alert_id:
        alert = db.query(RiskAlert).filter(RiskAlert.id == risk_alert_id, RiskAlert.org_id == org_id).first()

    risk_type = alert.risk_type if alert else "inventory_stockout"

    if risk_type == "inventory_stockout":
        return [
            {
                "title": "Option 1: Order from Primary Supplier",
                "description": "Standard purchase order. Lowest procurement cost, but relies on normal lead time (10-12 days).",
                "estimated_cost": 45000.0,
                "expected_delay_days": 4,
                "risk_level": "medium",
                "affected_orders": 3,
                "confidence": 0.92
            },
            {
                "title": "Option 2: Expedite via Secondary / Backup Supplier",
                "description": "Fast 2-day delivery from regional partner at a 15% unit surcharge to prevent manufacturing stoppage.",
                "estimated_cost": 52000.0,
                "expected_delay_days": 0,
                "risk_level": "low",
                "affected_orders": 0,
                "confidence": 0.88
            },
            {
                "title": "Option 3: Reschedule Production Sequence",
                "description": "Postpone assembly batches that require this material. Prioritize non-dependent customer orders.",
                "estimated_cost": 8500.0,
                "expected_delay_days": 2,
                "risk_level": "medium",
                "affected_orders": 2,
                "confidence": 0.79
            }
        ]

    elif risk_type == "supplier_delay":
        return [
            {
                "title": "Option 1: Wait with Priority Escalation",
                "description": "Keep existing PO, issue urgent delivery reminder, and allocate finished goods as soon as received.",
                "estimated_cost": 0.0,
                "expected_delay_days": 5,
                "risk_level": "high",
                "affected_orders": 4,
                "confidence": 0.82
            },
            {
                "title": "Option 2: Split Order to Alternative Supplier",
                "description": "Cancel pending volume and reorder urgently needed buffer from a vetted alternative.",
                "estimated_cost": 22000.0,
                "expected_delay_days": 1,
                "risk_level": "low",
                "affected_orders": 1,
                "confidence": 0.91
            },
            {
                "title": "Option 3: Customer Delivery Date Renegotiation",
                "description": "Notify customer proactively to extend deadline by 4 days with complimentary expedited freight.",
                "estimated_cost": 5000.0,
                "expected_delay_days": 4,
                "risk_level": "low",
                "affected_orders": 2,
                "confidence": 0.95
            }
        ]

    else:
        return [
            {
                "title": "Option 1: Overtime Production Shift",
                "description": "Authorize weekend machine shifts to compress production timeline by 3 days.",
                "estimated_cost": 18000.0,
                "expected_delay_days": 0,
                "risk_level": "low",
                "affected_orders": 0,
                "confidence": 0.89
            },
            {
                "title": "Option 2: Partial Delivery Shipment",
                "description": "Dispatch 60% available units today, followed by remaining balance upon final assembly.",
                "estimated_cost": 6500.0,
                "expected_delay_days": 1,
                "risk_level": "medium",
                "affected_orders": 1,
                "confidence": 0.94
            }
        ]
