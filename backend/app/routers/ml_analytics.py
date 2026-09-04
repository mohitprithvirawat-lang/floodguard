from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Location, SensorReading, RiskPrediction
from app.schemas import ModelMetricsOut, DataSourceInfo, LocationForecastOut
from app.ml.model import flood_model

router = APIRouter(prefix="/api", tags=["ML Analytics & Data Provenance"])

@router.get("/ml/metrics", response_model=ModelMetricsOut)
def get_ml_model_metrics():
    """
    Returns comprehensive ML model performance evaluation on the 70% train / 30% test split:
    Accuracy, precision, recall, F1 per risk level, 4x4 confusion matrix, and feature importances.
    """
    return flood_model.get_model_metrics()

@router.get("/ml/data-sources", response_model=List[DataSourceInfo])
def get_data_sources():
    """
    Returns official hydrological and meteorological data provenance (IMD, CWC, ISRO Bhuvan, Open-Meteo).
    """
    return flood_model.get_data_sources_info()

@router.get("/locations/{location_id}/forecast", response_model=LocationForecastOut)
def get_location_future_forecast(location_id: int, db: Session = Depends(get_db)):
    """
    Returns +1h, +2h, +3h, and +6h future trajectory forecast for a monitoring station.
    """
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    reading = db.query(SensorReading).filter(
        SensorReading.location_id == loc.id
    ).order_by(SensorReading.timestamp.desc()).first()

    pred = db.query(RiskPrediction).filter(
        RiskPrediction.location_id == loc.id
    ).order_by(RiskPrediction.timestamp.desc()).first()

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

    current_pred = flood_model.predict_risk(features)
    future_steps = flood_model.predict_future_trajectory(
        current_features=features,
        scenario=loc.scenario or "NORMAL",
        base_time=datetime.utcnow()
    )

    return {
        "location_id": loc.id,
        "location_name": loc.name,
        "current_time": datetime.utcnow().strftime("%H:%M UTC"),
        "current_risk_score": current_pred["risk_score"],
        "current_risk_level": current_pred["risk_level"],
        "confidence_score": current_pred["confidence_score"],
        "forecast_steps": future_steps
    }
