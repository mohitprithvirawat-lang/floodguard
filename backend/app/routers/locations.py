import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Location, SensorReading, RiskPrediction, Infrastructure, Alert
from app.schemas import LocationOut, LocationDetailOut, SensorReadingOut, RiskPredictionOut
from app.services.impact_service import assess_infrastructure_impact

router = APIRouter(prefix="/api/locations", tags=["Locations"])

@router.get("", response_model=List[LocationOut])
def get_all_locations(db: Session = Depends(get_db)):
    """Fetches all monitored stations along with current reading and latest AI risk score."""
    locations = db.query(Location).all()
    out = []
    for loc in locations:
        latest_reading = db.query(SensorReading).filter(
            SensorReading.location_id == loc.id
        ).order_by(SensorReading.timestamp.desc()).first()

        latest_pred = db.query(RiskPrediction).filter(
            RiskPrediction.location_id == loc.id
        ).order_by(RiskPrediction.timestamp.desc()).first()

        pred_dict = None
        if latest_pred:
            pred_dict = {
                "id": latest_pred.id,
                "location_id": latest_pred.location_id,
                "timestamp": latest_pred.timestamp,
                "risk_score": latest_pred.risk_score,
                "risk_level": latest_pred.risk_level,
                "warning_window_minutes": latest_pred.warning_window_minutes,
                "feature_contributions": json.loads(latest_pred.contributions_json or "{}")
            }

        out.append({
            "id": loc.id,
            "name": loc.name,
            "lat": loc.lat,
            "lng": loc.lng,
            "district": loc.district,
            "state": loc.state,
            "slope": loc.slope,
            "elevation": loc.elevation,
            "river_name": loc.river_name,
            "danger_river_level": loc.danger_river_level,
            "scenario": loc.scenario,
            "current_reading": latest_reading,
            "latest_prediction": pred_dict
        })
    return out

@router.get("/{location_id}", response_model=LocationDetailOut)
def get_location_details(location_id: int, db: Session = Depends(get_db)):
    """Fetches comprehensive details for a specific station including infrastructure, history, and alerts."""
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    latest_reading = db.query(SensorReading).filter(
        SensorReading.location_id == loc.id
    ).order_by(SensorReading.timestamp.desc()).first()

    latest_pred = db.query(RiskPrediction).filter(
        RiskPrediction.location_id == loc.id
    ).order_by(RiskPrediction.timestamp.desc()).first()

    pred_dict = None
    curr_level = "NORMAL"
    if latest_pred:
        curr_level = latest_pred.risk_level
        pred_dict = {
            "id": latest_pred.id,
            "location_id": latest_pred.location_id,
            "timestamp": latest_pred.timestamp,
            "risk_score": latest_pred.risk_score,
            "risk_level": latest_pred.risk_level,
            "warning_window_minutes": latest_pred.warning_window_minutes,
            "feature_contributions": json.loads(latest_pred.contributions_json or "{}")
        }

    # Fetch infrastructure & evaluate impact
    raw_infra = db.query(Infrastructure).filter(Infrastructure.location_id == loc.id).all()
    assessed_infra = assess_infrastructure_impact(loc, raw_infra, current_risk_level=curr_level)

    # 24 latest readings history
    readings = db.query(SensorReading).filter(
        SensorReading.location_id == loc.id
    ).order_by(SensorReading.timestamp.desc()).limit(24).all()
    readings = list(reversed(readings))

    # Alerts for this location
    alerts = db.query(Alert).filter(
        Alert.location_id == loc.id
    ).order_by(Alert.created_at.desc()).limit(10).all()

    alerts_out = [{
        "id": a.id,
        "location_id": a.location_id,
        "location_name": loc.name,
        "district": loc.district,
        "state": loc.state,
        "risk_level": a.risk_level,
        "message": a.message,
        "action_recommended": a.action_recommended,
        "created_at": a.created_at,
        "acknowledged": a.acknowledged
    } for a in alerts]

    return {
        "id": loc.id,
        "name": loc.name,
        "lat": loc.lat,
        "lng": loc.lng,
        "district": loc.district,
        "state": loc.state,
        "slope": loc.slope,
        "elevation": loc.elevation,
        "river_name": loc.river_name,
        "danger_river_level": loc.danger_river_level,
        "scenario": loc.scenario,
        "current_reading": latest_reading,
        "latest_prediction": pred_dict,
        "infrastructure": assessed_infra,
        "readings_history": readings,
        "recent_alerts": alerts_out
    }

@router.get("/{location_id}/history")
def get_location_history(location_id: int, limit: int = 30, db: Session = Depends(get_db)):
    """Returns chronological time-series readings and risk predictions for high-resolution charting."""
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    readings = db.query(SensorReading).filter(
        SensorReading.location_id == location_id
    ).order_by(SensorReading.timestamp.desc()).limit(limit).all()

    preds = db.query(RiskPrediction).filter(
        RiskPrediction.location_id == location_id
    ).order_by(RiskPrediction.timestamp.desc()).limit(limit).all()

    readings = list(reversed(readings))
    preds_by_time = {p.timestamp.isoformat(): p for p in preds}

    history_points = []
    for r in readings:
        t_str = r.timestamp.isoformat()
        p = preds_by_time.get(t_str)
        history_points.append({
            "timestamp": t_str,
            "rainfall_1h": r.rainfall_1h,
            "rainfall_3h": r.rainfall_3h,
            "rainfall_6h": r.rainfall_6h,
            "rainfall_24h": r.rainfall_24h,
            "river_level": r.river_level,
            "river_level_change_rate": r.river_level_change_rate,
            "danger_river_level": loc.danger_river_level,
            "soil_moisture": r.soil_moisture,
            "forecast_rainfall_next_3h": r.forecast_rainfall_next_3h,
            "risk_score": p.risk_score if p else None,
            "risk_level": p.risk_level if p else "NORMAL"
        })

    return {
        "location_id": loc.id,
        "name": loc.name,
        "danger_river_level": loc.danger_river_level,
        "history": history_points
    }
