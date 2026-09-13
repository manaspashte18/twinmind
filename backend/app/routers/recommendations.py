from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.models import User, RiskAlert, AuditLog
from app.schemas.schemas import *
from app.auth import get_current_user
from app.engine.recommendation_engine import generate_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("")
@router.get("/")
def get_all_recommendations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    risks = db.query(RiskAlert).filter(
        RiskAlert.org_id == current_user.org_id,
        RiskAlert.status == "active",
        RiskAlert.severity.in_(["high", "critical"])
    ).all()
    
    recommendations = []
    for risk in risks:
        recs = generate_recommendations(db, current_user.org_id, risk.id)
        recommendations.extend(recs)
        
    return recommendations

@router.get("/{risk_id}/options")
def get_recommendation_options(risk_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    risk = db.query(RiskAlert).filter(RiskAlert.id == risk_id, RiskAlert.org_id == current_user.org_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
        
    return generate_recommendations(db, current_user.org_id, risk_id)

@router.post("/{risk_id}/approve")
def approve_recommendation(
    risk_id: int, 
    option_data: dict, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    risk = db.query(RiskAlert).filter(RiskAlert.id == risk_id, RiskAlert.org_id == current_user.org_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk alert not found")
        
    title = option_data.get("title", "Approved Mitigation Action")
    cost = float(option_data.get("estimated_cost", 0.0))
    delay = int(option_data.get("expected_delay_days", 0))
    
    # Update risk alert to resolved status
    risk.status = "resolved"
    risk.resolved_at = datetime.utcnow()
    risk.recommendation = f"Approved mitigation: {title} (Est. cost: ${cost:,.0f}, Delay: {delay} days)"
    
    # Create audit log record for operational auditability
    log = AuditLog(
        user_id=current_user.id,
        action="approve_recommendation",
        entity_type="risk_alert",
        entity_id=risk.id,
        details=f"Approved recommendation '{title}' for risk #{risk.id} ({risk.title}).",
        org_id=current_user.org_id
    )
    db.add(log)
    db.commit()
    db.refresh(risk)
    
    return {
        "status": "success",
        "message": f"Successfully approved and executed: {title}",
        "risk": {
            "id": risk.id,
            "title": risk.title,
            "status": risk.status,
            "resolved_at": risk.resolved_at.isoformat() if risk.resolved_at else None,
            "recommendation": risk.recommendation
        }
    }
