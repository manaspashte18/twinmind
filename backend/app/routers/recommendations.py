import random
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models.models import (
    User, RiskAlert, AuditLog, Material, Supplier, 
    SupplierMaterial, PurchaseOrder, PurchaseOrderItem, 
    SalesOrder, SalesOrderItem, Notification, Product, ProductMaterial
)
from app.schemas.schemas import *
from app.auth import get_current_user
from app.engine.recommendation_engine import generate_recommendations
from app.engine.risk_service import run_risk_detection

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
    
    execution_details: Dict[str, Any] = {
        "action": title,
        "type": "generic",
        "target_url": "/risks"
    }

    # ==========================================
    # 1. INVENTORY STOCKOUT MITIGATIONS
    # ==========================================
    if risk.risk_type == "inventory_stockout":
        # Identify material
        material = None
        if risk.entity_type == "material" and risk.entity_id:
            material = db.query(Material).filter(
                Material.id == risk.entity_id, 
                Material.org_id == current_user.org_id
            ).first()
        
        # Fallback if not matched directly
        if not material:
            material = db.query(Material).filter(
                Material.org_id == current_user.org_id
            ).first()

        if material:
            # Option 1 or Option 2: Place Purchase Order
            if "Primary" in title or "Backup" in title or "Expedite" in title or "Secondary" in title or "Option 1" in title or "Option 2" in title:
                is_expedited = "Expedite" in title or "Backup" in title or "Secondary" in title or "Option 2" in title

                # Find Primary or Alternative Supplier
                supplier = None
                unit_price = float(material.unit_cost or 50.0)

                if is_expedited:
                    # Look for non-primary supplier link or secondary vendor
                    sm_alt = db.query(SupplierMaterial).join(
                        Supplier, Supplier.id == SupplierMaterial.supplier_id
                    ).filter(
                        SupplierMaterial.material_id == material.id,
                        Supplier.org_id == current_user.org_id,
                        SupplierMaterial.is_primary == False
                    ).first()

                    if sm_alt:
                        supplier = db.query(Supplier).filter(Supplier.id == sm_alt.supplier_id).first()
                        unit_price = float(sm_alt.unit_price or material.unit_cost)
                    else:
                        # Pick any available supplier with good delivery
                        supplier = db.query(Supplier).filter(
                            Supplier.org_id == current_user.org_id
                        ).order_by(Supplier.on_time_delivery_rate.desc()).first()

                    # 15% surcharge for expedited shipment
                    unit_price = round(unit_price * 1.15, 2)
                    lead_days = 2
                    po_status = "ordered"
                else:
                    # Standard Primary Supplier
                    sm_pri = db.query(SupplierMaterial).join(
                        Supplier, Supplier.id == SupplierMaterial.supplier_id
                    ).filter(
                        SupplierMaterial.material_id == material.id,
                        Supplier.org_id == current_user.org_id,
                        SupplierMaterial.is_primary == True
                    ).first()

                    if sm_pri:
                        supplier = db.query(Supplier).filter(Supplier.id == sm_pri.supplier_id).first()
                        unit_price = float(sm_pri.unit_price or material.unit_cost)
                    else:
                        supplier = db.query(Supplier).filter(
                            Supplier.org_id == current_user.org_id
                        ).order_by(Supplier.on_time_delivery_rate.desc()).first()
                    
                    lead_days = int(supplier.avg_delivery_days or 7) if supplier else 7
                    po_status = "ordered"

                if not supplier:
                    # If no supplier exists in db, create default vendor
                    supplier = Supplier(
                        name="Apex Global Components",
                        avg_delivery_days=lead_days,
                        on_time_delivery_rate=0.95,
                        org_id=current_user.org_id
                    )
                    db.add(supplier)
                    db.flush()

                # Economic batch quantity (approx 30 days usage or 1.5x minimum stock)
                usage = material.avg_daily_usage or 10.0
                min_stock = material.min_stock_level or 100.0
                reorder_qty = float(round(max(min_stock * 1.5, usage * 30.0, 500.0)))
                total_amt = round(reorder_qty * unit_price, 2)
                expected_date = date.today() + timedelta(days=lead_days)

                # Generate unique PO number
                while True:
                    po_num = f"PO-{random.randint(1000, 9999)}"
                    if not db.query(PurchaseOrder).filter(PurchaseOrder.po_number == po_num).first():
                        break

                new_po = PurchaseOrder(
                    po_number=po_num,
                    supplier_id=supplier.id,
                    status=po_status,
                    order_date=date.today(),
                    expected_delivery_date=expected_date,
                    total_amount=total_amt,
                    org_id=current_user.org_id
                )
                db.add(new_po)
                db.flush()

                new_po_item = PurchaseOrderItem(
                    purchase_order_id=new_po.id,
                    material_id=material.id,
                    quantity=reorder_qty,
                    unit_price=unit_price
                )
                db.add(new_po_item)

                # Dispatch Notification
                notif_title = f"{'⚡ Expedited ' if is_expedited else ''}PO {po_num} Generated"
                notif_msg = (
                    f"Generated {po_num} for {reorder_qty:,.0f} {material.unit} of {material.name} "
                    f"with {supplier.name} at ${total_amt:,.2f}. Estimated arrival: {expected_date}."
                )
                db.add(Notification(
                    org_id=current_user.org_id,
                    title=notif_title,
                    message=notif_msg,
                    severity="low",
                    link="/purchase-orders",
                    is_read=False
                ))

                execution_details = {
                    "type": "purchase_order",
                    "action": f"{'Expedited ' if is_expedited else 'Standard '}Purchase Order Created",
                    "order_number": po_num,
                    "order_id": new_po.id,
                    "supplier_name": supplier.name,
                    "item_name": material.name,
                    "quantity": reorder_qty,
                    "unit": material.unit,
                    "total_amount": total_amt,
                    "expected_delivery_date": expected_date.strftime("%b %d, %Y"),
                    "status": po_status,
                    "target_url": "/purchase-orders",
                    "summary": f"Generated PO {po_num} for {reorder_qty:,.0f} {material.unit} with {supplier.name}."
                }

            # Option 3: Reschedule Production Sequence
            else:
                # Find sales orders that use this material or open sales orders
                affected_sos = db.query(SalesOrder).filter(
                    SalesOrder.org_id == current_user.org_id,
                    SalesOrder.status.in_(["pending", "confirmed"])
                ).limit(3).all()

                so_numbers = []
                for so in affected_sos:
                    so.status = "in_production"
                    if so.promised_delivery_date:
                        so.promised_delivery_date = so.promised_delivery_date + timedelta(days=4)
                    else:
                        so.promised_delivery_date = date.today() + timedelta(days=12)
                    so_numbers.append(so.so_number)

                db.add(Notification(
                    org_id=current_user.org_id,
                    title="Production Timeline Rescheduled",
                    message=f"Adjusted schedules and delivery buffers (+4 days) for orders: {', '.join(so_numbers)}.",
                    severity="low",
                    link="/sales-orders",
                    is_read=False
                ))

                execution_details = {
                    "type": "sales_order_reschedule",
                    "action": "Production Sequence Rescheduled",
                    "order_numbers": so_numbers,
                    "count": len(so_numbers),
                    "summary": f"Buffer extended by 4 days and prioritized shop floor batches for {len(so_numbers)} open orders.",
                    "target_url": "/sales-orders"
                }

    # ==========================================
    # 2. SUPPLIER DELAY MITIGATIONS
    # ==========================================
    elif risk.risk_type == "supplier_delay":
        supplier = db.query(Supplier).filter(
            Supplier.id == risk.entity_id,
            Supplier.org_id == current_user.org_id
        ).first()

        if "Split" in title or "Alternative" in title or "Option 2" in title:
            # Query an alternative supplier
            alt_supplier = db.query(Supplier).filter(
                Supplier.org_id == current_user.org_id,
                Supplier.id != (supplier.id if supplier else -1)
            ).order_by(Supplier.on_time_delivery_rate.desc()).first()

            if not alt_supplier:
                alt_supplier = supplier

            # Pick a material supplied
            mat = db.query(Material).filter(Material.org_id == current_user.org_id).first()
            po_num = f"PO-{random.randint(1000, 9999)}"
            new_po = PurchaseOrder(
                po_number=po_num,
                supplier_id=alt_supplier.id if alt_supplier else 1,
                status="ordered",
                order_date=date.today(),
                expected_delivery_date=date.today() + timedelta(days=3),
                total_amount=cost if cost > 0 else 22000.0,
                org_id=current_user.org_id
            )
            db.add(new_po)
            db.flush()

            if mat:
                db.add(PurchaseOrderItem(
                    purchase_order_id=new_po.id,
                    material_id=mat.id,
                    quantity=300.0,
                    unit_price=float(mat.unit_cost or 50.0)
                ))

            execution_details = {
                "type": "purchase_order",
                "action": "Split Purchase Order Reallocated",
                "order_number": po_num,
                "order_id": new_po.id,
                "supplier_name": alt_supplier.name if alt_supplier else "Alternative Supplier",
                "total_amount": new_po.total_amount,
                "expected_delivery_date": str(new_po.expected_delivery_date),
                "target_url": "/purchase-orders",
                "summary": f"Split urgent allocation into {po_num} to bypass primary supplier bottleneck."
            }
        else:
            # Escalation or customer delivery buffer
            execution_details = {
                "type": "escalation",
                "action": "Expedited Escalation Notice Dispatched",
                "summary": f"Escalation priority dispatched to {supplier.name if supplier else 'vendor'} dispatch management.",
                "target_url": "/suppliers"
            }

    # ==========================================
    # 3. ORDER FULFILLMENT MITIGATIONS
    # ==========================================
    elif risk.risk_type == "order_delay":
        order = db.query(SalesOrder).filter(
            SalesOrder.id == risk.entity_id,
            SalesOrder.org_id == current_user.org_id
        ).first()

        if not order:
            order = db.query(SalesOrder).filter(
                SalesOrder.org_id == current_user.org_id
            ).first()

        if order:
            if "Overtime" in title or "Option 1" in title:
                order.status = "in_production"
                execution_details = {
                    "type": "sales_order",
                    "action": "Authorized Overtime Production Batch",
                    "order_number": order.so_number,
                    "order_id": order.id,
                    "status": "in_production",
                    "target_url": "/sales-orders",
                    "summary": f"Moved order {order.so_number} into active production queue with overtime shifts."
                }
            else:
                order.status = "shipped"
                execution_details = {
                    "type": "sales_order",
                    "action": "Partial Batch Shipment Dispatched",
                    "order_number": order.so_number,
                    "order_id": order.id,
                    "status": "shipped",
                    "target_url": "/sales-orders",
                    "summary": f"Confirmed 60% partial batch dispatch for {order.so_number}."
                }

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
        details=f"Approved recommendation '{title}' for risk #{risk.id} ({risk.title}). Executed action details: {execution_details.get('summary', '')}",
        org_id=current_user.org_id
    )
    db.add(log)
    db.commit()
    db.refresh(risk)

    # Re-evaluate risks automatically in background to reflect newly injected orders into pipeline
    try:
        run_risk_detection(db, current_user.org_id)
    except Exception as e:
        print(f"Warning: background risk detection failed: {e}")
    
    return {
        "status": "success",
        "message": f"Successfully approved and executed: {title}",
        "execution_details": execution_details,
        "risk": {
            "id": risk.id,
            "title": risk.title,
            "status": risk.status,
            "resolved_at": risk.resolved_at.isoformat() if risk.resolved_at else None,
            "recommendation": risk.recommendation
        }
    }
