from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import ScenarioRequest, ScenarioResult
from app.auth import get_current_user
from app.engine.scenario_engine import run_scenario

router = APIRouter(prefix="/simulator", tags=["simulator"])

@router.post("/scenario", response_model=ScenarioResult)
def execute_scenario(scenario: ScenarioRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = run_scenario(db, current_user.org_id, scenario.scenario_type, scenario.parameters)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
