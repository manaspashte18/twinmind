from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.models import User, RiskAlert
from app.schemas.schemas import *
from app.auth import get_current_user
from app.engine.inventory_engine import analyze_inventory_risks
from app.engine.supplier_engine import analyze_supplier_risks
from app.engine.order_engine import analyze_order_risks

router = APIRouter(prefix="/risks", tags=["risks"])

@router.get("")
@router.get("/")
def list_risks(
    severity: Optional[str] = None, 
    risk_type: Optional[str] = None, 
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(RiskAlert).filter(RiskAlert.org_id == current_user.org_id)
    if status and status != "all":
        query = query.filter(RiskAlert.status == status)
    if severity:
        query = query.filter(RiskAlert.severity == severity)
    if risk_type:
        query = query.filter(RiskAlert.risk_type == risk_type)
    return query.all()

@router.get("/{risk_id}")
def get_risk(risk_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    risk = db.query(RiskAlert).filter(RiskAlert.id == risk_id, RiskAlert.org_id == current_user.org_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    return risk

@router.put("/{risk_id}/acknowledge")
@router.post("/{risk_id}/acknowledge")
def acknowledge_risk(risk_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    risk = db.query(RiskAlert).filter(RiskAlert.id == risk_id, RiskAlert.org_id == current_user.org_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    risk.status = "acknowledged"
    db.commit()
    db.refresh(risk)
    return risk

@router.put("/{risk_id}/dismiss")
@router.post("/{risk_id}/dismiss")
def dismiss_risk(risk_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    risk = db.query(RiskAlert).filter(RiskAlert.id == risk_id, RiskAlert.org_id == current_user.org_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    risk.status = "dismissed"
    db.commit()
    db.refresh(risk)
    return risk

@router.post("/recalculate")
def recalculate_risks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org_id = current_user.org_id
    
    # Run analysis engines
    inv_risks = analyze_inventory_risks(db, org_id)
    supp_risks = analyze_supplier_risks(db, org_id)
    ord_risks = analyze_order_risks(db, org_id)
    
    # 1. Sync inventory risks
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

    # 2. Sync supplier risks
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

    # 3. Sync order risks
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
        
    db.commit()
    
    total_active = db.query(RiskAlert).filter(RiskAlert.org_id == org_id, RiskAlert.status == "active").count()
    return {
        "status": "success",
        "message": f"Successfully recalculated operational risks. {total_active} active risks identified.",
        "active_risks_count": total_active
    }
