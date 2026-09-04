import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Location, SensorReading, RiskPrediction
from app.schemas import RiskPredictionOut, SensorReadingBase
from app.ml.model import flood_model
from app.ml.slope_stability import calculate_slope_stability, combine_hydrological_and_geotechnical

router = APIRouter(prefix="/api", tags=["Risk Prediction"])

@router.get("/risk-map")
def get_risk_map(db: Session = Depends(get_db)):
    """
    Returns batch GeoJSON/Map data with current risk status, color codes,
    hydrological risk, physics-based geotechnical slope stability (FoS),
    and key sensor metrics for all monitored Himalayan stations.
    """
    locations = db.query(Location).all()
    results = []

    for loc in locations:
        latest_reading = db.query(SensorReading).filter(
            SensorReading.location_id == loc.id
        ).order_by(SensorReading.timestamp.desc()).first()

        latest_pred = db.query(RiskPrediction).filter(
            RiskPrediction.location_id == loc.id
        ).order_by(RiskPrediction.timestamp.desc()).first()

        risk_score = latest_pred.risk_score if latest_pred else 12.0
        risk_level = latest_pred.risk_level if latest_pred else "NORMAL"
        warning_window = latest_pred.warning_window_minutes if latest_pred else 360
        contributions = json.loads(latest_pred.contributions_json) if (latest_pred and latest_pred.contributions_json) else {}

        # Physics-based slope stability evaluation
        soil_moisture_val = latest_reading.soil_moisture if latest_reading else 30.0
        geotech = calculate_slope_stability(
            slope_deg=loc.slope,
            soil_moisture_pct=soil_moisture_val
        )
        hybrid = combine_hydrological_and_geotechnical(
            hydrological_score=risk_score,
            hydrological_level=risk_level,
            geotech_result=geotech
        )

        # Color mapping code
        color_map = {
            "NORMAL": "#22c55e",
            "WATCH": "#eab308",
            "WARNING": "#f97316",
            "CRITICAL": "#ef4444"
        }

        results.append({
            "id": loc.id,
            "name": loc.name,
            "lat": loc.lat,
            "lng": loc.lng,
            "district": loc.district,
            "state": loc.state,
            "river_name": loc.river_name,
            "elevation": loc.elevation,
            "slope": loc.slope,
            "danger_river_level": loc.danger_river_level,
            "scenario": loc.scenario,
            "risk_score": hybrid["combined_risk_score"],
            "risk_level": hybrid["combined_risk_level"],
            "warning_window_minutes": warning_window,
            "color": color_map.get(hybrid["combined_risk_level"], "#22c55e"),
            "rainfall_1h": latest_reading.rainfall_1h if latest_reading else 0.0,
            "rainfall_3h": latest_reading.rainfall_3h if latest_reading else 0.0,
            "river_level": latest_reading.river_level if latest_reading else 2.5,
            "river_level_change_rate": latest_reading.river_level_change_rate if latest_reading else 0.0,
            "soil_moisture": soil_moisture_val,
            "forecast_rainfall_next_3h": latest_reading.forecast_rainfall_next_3h if latest_reading else 0.0,
            "top_risk_driver": list(contributions.keys())[0] if contributions else "rainfall_3h",
            "hydrological_risk": hybrid["hydrological_risk"],
            "geotechnical_risk": hybrid["geotechnical_risk"],
            "hybrid_risk": {
                "combined_risk_score": hybrid["combined_risk_score"],
                "combined_risk_level": hybrid["combined_risk_level"],
                "physics_override_applied": hybrid["physics_override_applied"],
                "fusion_rationale": hybrid["fusion_rationale"]
            }
        })

    return {
        "count": len(results),
        "stations": results
    }

@router.post("/predict/{location_id}", response_model=RiskPredictionOut)
def predict_location_risk(
    location_id: int,
    custom_features: Optional[Dict[str, float]] = Body(None),
    db: Session = Depends(get_db)
):
    """
    On-demand ML prediction endpoint. Uses provided features or falls back to latest database telemetry.
    """
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    if not custom_features:
        reading = db.query(SensorReading).filter(
            SensorReading.location_id == loc.id
        ).order_by(SensorReading.timestamp.desc()).first()

        if not reading:
            raise HTTPException(status_code=400, detail="No sensor readings available for this location")

        features = {
            "rainfall_1h": reading.rainfall_1h,
            "rainfall_3h": reading.rainfall_3h,
            "rainfall_6h": reading.rainfall_6h,
            "rainfall_24h": reading.rainfall_24h,
            "temperature": reading.temperature,
            "humidity": reading.humidity,
            "river_level": reading.river_level,
            "river_level_change_rate": reading.river_level_change_rate,
            "soil_moisture": reading.soil_moisture,
            "slope": loc.slope,
            "elevation": loc.elevation,
            "distance_from_river": reading.distance_from_river,
            "forecast_rainfall_next_3h": reading.forecast_rainfall_next_3h
        }
    else:
        features = custom_features
        features.setdefault("slope", loc.slope)
        features.setdefault("elevation", loc.elevation)
        features.setdefault("distance_from_river", 50.0)

    result = flood_model.predict_risk(features)

    return {
        "location_id": loc.id,
        "timestamp": None,
        "risk_score": result["risk_score"],
        "risk_level": result["risk_level"],
        "warning_window_minutes": result["warning_window_minutes"],
        "feature_contributions": result["feature_contributions"],
        "hydrological_risk": result.get("hydrological_risk"),
        "geotechnical_risk": result.get("geotechnical_risk"),
        "hybrid_risk": result.get("hybrid_risk")
    }

@router.get("/risk/{location_id}", response_model=RiskPredictionOut)
def get_current_risk(location_id: int, db: Session = Depends(get_db)):
    """Returns the latest stored AI risk prediction with explainability breakdown and slope stability FoS."""
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    pred = db.query(RiskPrediction).filter(
        RiskPrediction.location_id == location_id
    ).order_by(RiskPrediction.timestamp.desc()).first()

    if not pred:
        raise HTTPException(status_code=404, detail="No prediction found for this location")

    latest_reading = db.query(SensorReading).filter(
        SensorReading.location_id == location_id
    ).order_by(SensorReading.timestamp.desc()).first()

    soil_moisture = latest_reading.soil_moisture if latest_reading else 30.0
    geotech = calculate_slope_stability(slope_deg=loc.slope, soil_moisture_pct=soil_moisture)
    hybrid = combine_hydrological_and_geotechnical(
        hydrological_score=pred.risk_score,
        hydrological_level=pred.risk_level,
        geotech_result=geotech
    )

    return {
        "id": pred.id,
        "location_id": pred.location_id,
        "timestamp": pred.timestamp,
        "risk_score": hybrid["combined_risk_score"],
        "risk_level": hybrid["combined_risk_level"],
        "warning_window_minutes": pred.warning_window_minutes,
        "feature_contributions": json.loads(pred.contributions_json or "{}"),
        "hydrological_risk": hybrid["hydrological_risk"],
        "geotechnical_risk": hybrid["geotechnical_risk"],
        "hybrid_risk": {
            "combined_risk_score": hybrid["combined_risk_score"],
            "combined_risk_level": hybrid["combined_risk_level"],
            "physics_override_applied": hybrid["physics_override_applied"],
            "fusion_rationale": hybrid["fusion_rationale"]
        }
    }
