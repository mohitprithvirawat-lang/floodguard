from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Location, SMSDispatch, SensorReading, RiskPrediction
from app.schemas import SMSPreviewRequest, SMSPreviewResponse, SMSDispatchRequest, SMSDispatchOut
from app.services.sms_service import generate_sms_text, dispatch_emergency_sms, SMS_TEMPLATES

router = APIRouter(prefix="/api/sms", tags=["Emergency SMS Broadcast"])

@router.get("/templates")
def get_sms_templates():
    """Returns pre-configured CAP-compliant emergency SMS templates."""
    return {
        "count": len(SMS_TEMPLATES),
        "templates": SMS_TEMPLATES
    }

@router.post("/preview", response_model=SMSPreviewResponse)
def preview_emergency_sms(payload: SMSPreviewRequest, db: Session = Depends(get_db)):
    """
    Generates dynamic SMS broadcast copy tailored to location, threat level, and language.
    """
    location = db.query(Location).filter(Location.id == payload.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    pred = db.query(RiskPrediction).filter(
        RiskPrediction.location_id == location.id
    ).order_by(RiskPrediction.timestamp.desc()).first()

    reading = db.query(SensorReading).filter(
        SensorReading.location_id == location.id
    ).order_by(SensorReading.timestamp.desc()).first()

    risk_level = pred.risk_level if pred else "NORMAL"
    risk_score = pred.risk_score if pred else 12.0
    lead_time = pred.warning_window_minutes if pred else 360
    river_stage = reading.river_level if reading else 2.5

    result = generate_sms_text(
        location=location,
        risk_level=risk_level,
        risk_score=risk_score,
        lead_time=lead_time,
        river_stage=river_stage,
        language=payload.language,
        custom_safe_zone=payload.safe_zone,
        recipient_group=payload.recipient_group
    )

    return result

@router.post("/dispatch", response_model=SMSDispatchOut)
def dispatch_sms(payload: SMSDispatchRequest, db: Session = Depends(get_db)):
    """
    Dispatches (or simulates) emergency SMS broadcast to target stakeholders and records audit log.
    """
    try:
        record = dispatch_emergency_sms(
            db=db,
            location_id=payload.location_id,
            recipient_group=payload.recipient_group,
            language=payload.language,
            message_text=payload.message_text,
            sample_phone=payload.sample_phone
        )
        return {
            "id": record.id,
            "location_id": record.location_id,
            "location_name": record.location.name if record.location else None,
            "recipient_group": record.recipient_group,
            "phone_numbers_count": record.phone_numbers_count,
            "sample_phone": record.sample_phone,
            "language": record.language,
            "risk_level": record.risk_level,
            "message_text": record.message_text,
            "status": record.status,
            "delivery_rate": record.delivery_rate,
            "carrier_reference": record.carrier_reference,
            "created_at": record.created_at
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history", response_model=List[SMSDispatchOut])
def get_sms_history(
    location_id: Optional[int] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """Fetches chronological emergency SMS broadcast logs."""
    query = db.query(SMSDispatch, Location).join(Location, SMSDispatch.location_id == Location.id)
    if location_id:
        query = query.filter(SMSDispatch.location_id == location_id)

    records = query.order_by(SMSDispatch.created_at.desc()).limit(limit).all()

    out = []
    for dispatch, loc in records:
        out.append({
            "id": dispatch.id,
            "location_id": dispatch.location_id,
            "location_name": loc.name,
            "recipient_group": dispatch.recipient_group,
            "phone_numbers_count": dispatch.phone_numbers_count,
            "sample_phone": dispatch.sample_phone,
            "language": dispatch.language,
            "risk_level": dispatch.risk_level,
            "message_text": dispatch.message_text,
            "status": dispatch.status,
            "delivery_rate": dispatch.delivery_rate,
            "carrier_reference": dispatch.carrier_reference,
            "created_at": dispatch.created_at
        })
    return out
