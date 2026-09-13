from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.models import User, Organization
from app.schemas.schemas import UserRegister, UserLogin, UserResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    org = Organization(
        name=data.org_name,
        industry=data.industry,
        scale="small"
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    new_user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        role="owner",
        org_id=org.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "org_id": new_user.org_id})
    user_dict = {
        "id": new_user.id,
        "email": new_user.email,
        "name": new_user.name,
        "role": new_user.role,
        "org_id": new_user.org_id,
        "is_active": new_user.is_active,
        "created_at": new_user.created_at.isoformat()
    }
    return {
        "access_token": token,
        "token": token,
        "token_type": "bearer",
        "user": user_dict
    }

@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token({"sub": str(user.id), "org_id": user.org_id})
    user_dict = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "org_id": user.org_id,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat()
    }
    return {
        "access_token": token,
        "token": token,
        "token_type": "bearer",
        "user": user_dict
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
