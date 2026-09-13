from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
import io
import csv
from app.database import get_db
from app.models.models import User, Material, Supplier, InventoryRecord, PurchaseOrder, SalesOrder
from app.schemas.schemas import *
from app.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/daily")
def get_daily_report(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Mocking a daily report summary for the sake of the router implementation
    return {
        "inventory": "Summary of inventory changes today.",
        "suppliers": "Supplier performance highlights.",
        "orders": "Orders placed and received.",
        "risks": "New risks identified today.",
        "recommendations": "Top actionable recommendations."
    }

@router.get("/export")
def export_data(
    entity_type: str = Query(..., description="materials|suppliers|inventory|purchase_orders|sales_orders"), 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    entity_map = {
        "materials": Material,
        "suppliers": Supplier,
        "inventory": InventoryRecord,
        "purchase_orders": PurchaseOrder,
        "sales_orders": SalesOrder
    }
    
    ModelClass = entity_map.get(entity_type)
    if not ModelClass:
        raise HTTPException(status_code=400, detail="Invalid entity type")
        
    records = db.query(ModelClass).filter(ModelClass.org_id == current_user.org_id).all()
    if not records:
        return StreamingResponse(io.StringIO(""), media_type="text/csv")
        
    output = io.StringIO()
    # Get column names from the first record
    columns = [c.name for c in ModelClass.__table__.columns]
    writer = csv.DictWriter(output, fieldnames=columns)
    
    writer.writeheader()
    for record in records:
        row = {c: getattr(record, c) for c in columns}
        writer.writerow(row)
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={entity_type}_export.csv"}
    )
