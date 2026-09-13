from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.models import Product, ProductMaterial, Material, User
from app.schemas.schemas import (
    ProductResponse, ProductCreate, ProductUpdate,
    ProductMaterialResponse, ProductMaterialCreate
)
from app.auth import get_current_user

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductResponse])
@router.get("/", response_model=List[ProductResponse])
def get_products(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Product).filter(
        Product.org_id == current_user.org_id
    ).offset(skip).limit(limit).all()

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = Product(
        **data.model_dump(),
        org_id=current_user.org_id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.org_id == current_user.org_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.org_id == current_user.org_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.org_id == current_user.org_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

@router.get("/{product_id}/materials")
def get_product_materials(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.org_id == current_user.org_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    boms = db.query(ProductMaterial, Material).join(
        Material, ProductMaterial.material_id == Material.id
    ).filter(ProductMaterial.product_id == product_id).all()
    
    return [
        {
            "id": pm.id,
            "material_id": pm.material_id,
            "material_name": mat.name,
            "material_code": mat.code,
            "quantity_required": pm.quantity_required,
            "unit": mat.unit,
            "unit_cost": mat.unit_cost
        }
        for pm, mat in boms
    ]
