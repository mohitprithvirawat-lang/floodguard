from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Location, Infrastructure, RiskPrediction
from app.schemas import InfrastructureOut
from app.services.impact_service import assess_infrastructure_impact

router = APIRouter(prefix="/api/impact", tags=["Impact Assessment"])

@router.get("/{location_id}", response_model=List[InfrastructureOut])
def get_location_impact_assessment(location_id: int, db: Session = Depends(get_db)):
    """
    Returns nearby infrastructure ranked by proximity and vulnerability score,
    providing an actionable evacuation priority order for disaster authorities.
    """
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    latest_pred = db.query(RiskPrediction).filter(
        RiskPrediction.location_id == loc.id
    ).order_by(RiskPrediction.timestamp.desc()).first()

    current_risk_level = latest_pred.risk_level if latest_pred else "NORMAL"

    raw_infra = db.query(Infrastructure).filter(Infrastructure.location_id == loc.id).all()
    assessed = assess_infrastructure_impact(loc, raw_infra, current_risk_level=current_risk_level)

    return assessed
