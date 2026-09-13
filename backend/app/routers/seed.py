from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.seed.seed_data import seed_database

router = APIRouter()

@router.post("/seed")
def run_seed(db: Session = Depends(get_db)):
    result = seed_database(db)
    return result
