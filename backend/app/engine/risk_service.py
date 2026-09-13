import logging
import urllib.request
import json
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import RiskAlert, Notification
from app.engine.inventory_engine import analyze_inventory_risks
from app.engine.supplier_engine import analyze_supplier_risks
from app.engine.order_engine import analyze_order_risks

logger = logging.getLogger(__name__)

def dispatch_webhook(url: str, payload: dict):
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url, 
            data=data, 
            headers={'Content-Type': 'application/json', 'User-Agent': 'TwinMind-Agent/1.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status
    except Exception as e:
        logger.warning(f"Failed to dispatch webhook to {url}: {e}")
        return None

def run_risk_detection(db: Session, org_id: int, webhook_url: str = None) -> dict:
    """
    Executes automated risk evaluation across inventory, suppliers, and customer orders.
    Synchronizes results with the RiskAlert and Notification tables.
    """
    inv_risks = analyze_inventory_risks(db, org_id)
    supp_risks = analyze_supplier_risks(db, org_id)
    ord_risks = analyze_order_risks(db, org_id)
    
    new_notifications = []

    # 1. Evaluate Inventory Risks
    for r in inv_risks:
        sev = str(r.get("severity", "medium")).lower()
        if sev not in ["critical", "high", "medium"]:
            continue
            
        mat_id = r.get("material_id")
        mat_name = r.get("material_name")
        days_left = r.get("days_until_stockout", 0)
        days_str = f"{days_left:.1f} days" if days_left < 999 else "imminent"
        
        existing = db.query(RiskAlert).filter(
            RiskAlert.org_id == org_id,
            RiskAlert.entity_type == "material",
            RiskAlert.entity_id == mat_id,
            RiskAlert.status == "active"
        ).first()
        
        title = f"{sev.capitalize()}: {mat_name} stockout imminent ({days_str} left)"
        desc = f"Current inventory ({r.get('current_qty', 0):.0f} units) with daily usage of {r.get('avg_daily_usage', 0):.1f} units reaches zero before supplier lead time."
        
        if existing:
            existing.severity = sev
            existing.score = float(r.get("score", 75))
            existing.title = title
            existing.description = desc
            existing.recommendation = r.get("recommendation")
        else:
            new_alert = RiskAlert(
                risk_type="inventory_stockout",
                severity=sev,
                score=float(r.get("score", 75)),
                entity_type="material",
                entity_id=mat_id,
                title=title,
                description=desc,
                impact_description="Halted production line and delayed downstream customer deliveries.",
                recommendation=r.get("recommendation", f"Issue emergency purchase order for {mat_name}."),
                financial_impact=float(r.get("financial_impact", 45000.0)),
                status="active",
                org_id=org_id
            )
            db.add(new_alert)

            if sev in ["critical", "high"]:
                notif = Notification(
                    org_id=org_id,
                    title=title,
                    message=desc,
                    severity=sev,
                    link="/inventory",
                    is_read=False
                )
                db.add(notif)
                new_notifications.append(notif)

    # 2. Evaluate Supplier Risks
    for r in supp_risks:
        sev = str(r.get("severity", "medium")).lower()
        supp_id = r.get("supplier_id")
        supp_name = r.get("supplier_name")
        on_time = r.get("on_time_rate", 0.0)
        
        existing = db.query(RiskAlert).filter(
            RiskAlert.org_id == org_id,
            RiskAlert.entity_type == "supplier",
            RiskAlert.entity_id == supp_id,
            RiskAlert.status == "active"
        ).first()
        
        title = f"{sev.capitalize()}: {supp_name} reliability degraded ({on_time * 100:.0f}% on-time)"
        desc = f"Historical on-time delivery rate dropped to {on_time * 100:.0f}%, risking component delivery delays."
        
        if existing:
            existing.severity = sev
            existing.title = title
            existing.description = desc
        else:
            new_alert = RiskAlert(
                risk_type="supplier_delay",
                severity=sev,
                score=80.0 if sev == "critical" else 65.0,
                entity_type="supplier",
                entity_id=supp_id,
                title=title,
                description=desc,
                impact_description="Cascading delays on component assembly schedules.",
                recommendation="Shift order allocation to backup vetted suppliers or negotiate expedited lead times.",
                financial_impact=60000.0,
                status="active",
                org_id=org_id
            )
            db.add(new_alert)

            if sev in ["critical", "high"]:
                notif = Notification(
                    org_id=org_id,
                    title=title,
                    message=desc,
                    severity=sev,
                    link="/suppliers",
                    is_read=False
                )
                db.add(notif)
                new_notifications.append(notif)

    # 3. Evaluate Order Fulfillment Risks
    for r in ord_risks:
        sev = str(r.get("severity", "medium")).lower()
        if sev not in ["critical", "high", "medium"]:
            continue
        so_id = r.get("order_id")
        so_num = r.get("so_number")
        rev = float(r.get("revenue_at_risk", 0.0))
        
        existing = db.query(RiskAlert).filter(
            RiskAlert.org_id == org_id,
            RiskAlert.entity_type == "order",
            RiskAlert.entity_id == so_id,
            RiskAlert.status == "active"
        ).first()
        
        title = f"{sev.capitalize()}: Order {so_num} at fulfillment risk"
        desc = f"Manufacturing schedule is delayed, threatening promised customer delivery deadline."
        
        if existing:
            existing.severity = sev
            existing.title = title
            existing.description = desc
            existing.financial_impact = rev
        else:
            new_alert = RiskAlert(
                risk_type="order_delay",
                severity=sev,
                score=70.0,
                entity_type="order",
                entity_id=so_id,
                title=title,
                description=desc,
                impact_description=f"${rev:,.0f} revenue exposed to customer late delivery penalties.",
                recommendation="Prioritize shop floor scheduling or arrange partial split shipments.",
                financial_impact=rev,
                status="active",
                org_id=org_id
            )
            db.add(new_alert)

            if sev in ["critical", "high"]:
                notif = Notification(
                    org_id=org_id,
                    title=title,
                    message=desc,
                    severity=sev,
                    link="/orders",
                    is_read=False
                )
                db.add(notif)
                new_notifications.append(notif)
        
    db.commit()

    # Outbound webhook alert if new notifications detected and webhook provided
    if webhook_url and new_notifications:
        for n in new_notifications:
            dispatch_webhook(webhook_url, {
                "event": "risk_alert",
                "severity": n.severity,
                "title": n.title,
                "message": n.message,
                "link": n.link,
                "timestamp": n.created_at.isoformat() if n.created_at else datetime.utcnow().isoformat()
            })
    
    total_active = db.query(RiskAlert).filter(RiskAlert.org_id == org_id, RiskAlert.status == "active").count()
    return {
        "status": "success",
        "message": f"Evaluated operational risks. {total_active} active risks identified.",
        "active_risks_count": total_active,
        "new_notifications_count": len(new_notifications)
    }
