from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.models import User, Notification
from app.auth import get_current_user
from app.engine.risk_service import dispatch_webhook

router = APIRouter(prefix="/notifications", tags=["notifications"])

class WebhookTestRequest(BaseModel):
    webhook_url: str

@router.get("")
@router.get("/")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.query(Notification).filter(
        Notification.org_id == current_user.org_id
    ).order_by(desc(Notification.created_at)).limit(30).all()

    unread_count = db.query(Notification).filter(
        Notification.org_id == current_user.org_id,
        Notification.is_read == False
    ).count()

    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "severity": n.severity,
                "link": n.link,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in notifs
        ]
    }

@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.org_id == current_user.org_id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return {"status": "success", "id": notif.id, "is_read": True}

@router.put("/read-all")
def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unread = db.query(Notification).filter(
        Notification.org_id == current_user.org_id,
        Notification.is_read == False
    ).all()

    for n in unread:
        n.is_read = True
    db.commit()

    return {"status": "success", "marked_read": len(unread)}

@router.post("/test-webhook")
def test_webhook(
    body: WebhookTestRequest,
    current_user: User = Depends(get_current_user)
):
    status_code = dispatch_webhook(body.webhook_url, {
        "event": "test_alert",
        "title": "TwinMind Operational Alert Test",
        "message": "This is a verification test from TwinMind Supply Chain Digital Twin.",
        "severity": "info",
        "organization_id": current_user.org_id
    })

    if status_code and 200 <= status_code < 300:
        return {"status": "success", "http_code": status_code, "message": "Webhook dispatched successfully"}
    else:
        return {"status": "error", "http_code": status_code, "message": "Failed to reach webhook destination"}
