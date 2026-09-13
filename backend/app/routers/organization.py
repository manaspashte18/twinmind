from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Organization, User
from app.schemas.schemas import OrganizationResponse, OrganizationUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/organization", tags=["Organization"])

@router.get("", response_model=OrganizationResponse)
@router.get("/", response_model=OrganizationResponse)
def get_organization(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == current_user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

@router.put("", response_model=OrganizationResponse)
@router.put("/", response_model=OrganizationResponse)
def update_organization(
    data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    org = db.query(Organization).filter(Organization.id == current_user.org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(org, key, value)
    
    db.commit()
    db.refresh(org)
    return org
