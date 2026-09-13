from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.models import User, RiskAlert
from app.schemas.schemas import *
from app.auth import get_current_user
from app.engine.risk_service import run_risk_detection

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
    result = run_risk_detection(db, current_user.org_id)
    return result

