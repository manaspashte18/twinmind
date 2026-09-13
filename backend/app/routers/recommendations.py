from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, RiskAlert
from app.schemas.schemas import *
from app.auth import get_current_user
from app.engine.recommendation_engine import generate_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/")
def get_all_recommendations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    risks = db.query(RiskAlert).filter(
        RiskAlert.org_id == current_user.org_id,
        RiskAlert.status == "active",
        RiskAlert.severity.in_(["high", "critical"])
    ).all()
    
    recommendations = []
    for risk in risks:
        recs = generate_recommendations(db, risk.id)
        recommendations.extend(recs)
        
    return recommendations

@router.get("/{risk_id}/options")
def get_recommendation_options(risk_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    risk = db.query(RiskAlert).filter(RiskAlert.id == risk_id, RiskAlert.org_id == current_user.org_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
        
    return generate_recommendations(db, risk_id)
