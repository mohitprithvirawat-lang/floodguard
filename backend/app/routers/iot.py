import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Location, SensorReading, RiskPrediction, SensorDevice
from app.schemas import IoTIngestPayload, IoTIngestResponse, SensorDeviceOut
from app.ml.model import flood_model
from app.services.alert_service import check_and_create_alert

logger = logging.getLogger("floodguard.iot")

router = APIRouter(prefix="/api/iot", tags=["IoT Ingestion & Sensor Health"])

MASTER_API_KEY = "fg_iot_master_key_2026"

def ingest_sensor_payload(
    db: Session,
    payload: IoTIngestPayload,
    header_api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Central validation and ingestion pipeline for both physical field devices
    and the background simulation ticker:
    1. Authenticates device via API key
    2. Enforces physical domain ranges & monotonicity
    3. Persists SensorReading
    4. Updates SensorDevice heartbeat and battery state
    5. Runs real-time AI & slope stability risk prediction
    6. Returns structured ingestion receipt
    """
    api_key = header_api_key or payload.api_key or ""
    device: Optional[SensorDevice] = None

    if api_key == MASTER_API_KEY:
        # Master key allows lookup by location_id or device_id
        if payload.location_id:
            device = db.query(SensorDevice).filter(SensorDevice.location_id == payload.location_id).first()
        elif payload.device_id:
            device = db.query(SensorDevice).filter(SensorDevice.device_id == payload.device_id).first()
    elif api_key:
        device = db.query(SensorDevice).filter(SensorDevice.api_key == api_key).first()

    # If device not found by key, try location_id if key matches location's device
    if not device and payload.location_id:
        cand = db.query(SensorDevice).filter(SensorDevice.location_id == payload.location_id).first()
        if cand and (cand.api_key == api_key or api_key == MASTER_API_KEY):
            device = cand

    if not device:
        # If no registered device yet, check if location exists
        if payload.location_id:
            loc = db.query(Location).filter(Location.id == payload.location_id).first()
            if loc:
                # Auto-register an active device for this station
                device = SensorDevice(
                    device_id=f"HIM-AUTO-STATION-{loc.id:02d}",
                    location_id=loc.id,
                    api_key=api_key or f"fg_auto_key_{loc.id}",
                    name=f"{loc.name} Primary Telemetry Unit",
                    device_type="TELEMETRY_COMBO",
                    last_seen_at=datetime.utcnow(),
                    battery_pct=payload.battery_pct or 96.0,
                    status="ONLINE"
                )
                db.add(device)
                db.flush()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Invalid device API key or unrecognised telemetry hardware ID."
        )

    loc = db.query(Location).filter(Location.id == device.location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Associated location not found")

    # --- Physical Validation & Anomaly Flagging ---
    validation_flags = []
    # 1. Monotonicity check on cumulative rain gauges
    if not (payload.rainfall_24h >= payload.rainfall_6h >= payload.rainfall_3h >= payload.rainfall_1h):
        validation_flags.append("NON_MONOTONIC_RAINFALL: Cumulative rainfall values violate temporal accumulation.")

    # 2. Extreme hydrological surge flags
    if payload.river_level_change_rate > 3.0:
        validation_flags.append("FLASH_SURGE_DETECTED: River rising faster than 3.0 m/h.")

    # 3. High soil saturation flag
    if payload.soil_moisture > 85.0:
        validation_flags.append("SATURATION_WARNING: Soil moisture exceeds 85% colluvial liquefaction threshold.")

    now = payload.timestamp or datetime.utcnow()

    # --- Persist Sensor Reading ---
    reading = SensorReading(
        location_id=loc.id,
        timestamp=now,
        rainfall_1h=round(payload.rainfall_1h, 2),
        rainfall_3h=round(payload.rainfall_3h, 2),
        rainfall_6h=round(payload.rainfall_6h, 2),
        rainfall_24h=round(payload.rainfall_24h, 2),
        temperature=round(payload.temperature, 1),
        humidity=round(payload.humidity, 1),
        river_level=round(payload.river_level, 2),
        river_level_change_rate=round(payload.river_level_change_rate, 2),
        soil_moisture=round(payload.soil_moisture, 1),
        distance_from_river=payload.distance_from_river or 50.0,
        forecast_rainfall_next_3h=round(payload.forecast_rainfall_next_3h or 0.0, 2)
    )
    db.add(reading)
    db.flush()

    # --- Update SensorDevice Health ---
    device.last_seen_at = now
    if payload.battery_pct is not None:
        device.battery_pct = round(payload.battery_pct, 1)
    device.status = "ONLINE" if len(validation_flags) == 0 else "FLAGGED"

    # --- Run AI Prediction & Geotechnical Physics ---
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
    pred_result = flood_model.predict_risk(features)

    # Detect risk state change for alert dispatch
    prev_pred = db.query(RiskPrediction).filter(
        RiskPrediction.location_id == loc.id
    ).order_by(RiskPrediction.timestamp.desc()).first()
    old_level = prev_pred.risk_level if prev_pred else None

    # Persist RiskPrediction
    prediction = RiskPrediction(
        location_id=loc.id,
        timestamp=now,
        risk_score=pred_result["risk_score"],
        risk_level=pred_result["risk_level"],
        warning_window_minutes=pred_result["warning_window_minutes"],
        contributions_json=json.dumps(pred_result["feature_contributions"])
    )
    db.add(prediction)
    db.flush()

    # Check and trigger emergency alert if threshold crossed
    alert = check_and_create_alert(
        db=db,
        location=loc,
        old_level=old_level,
        new_level=pred_result["risk_level"],
        risk_score=pred_result["risk_score"]
    )

    db.commit()

    return {
        "status": "FLAGGED" if validation_flags else "SUCCESS",
        "message": "Telemetry reading successfully validated and ingested." if not validation_flags else "Reading ingested with sensor validation flags.",
        "reading_id": reading.id,
        "device_id": device.device_id,
        "location_id": loc.id,
        "location_name": loc.name,
        "timestamp": now,
        "battery_pct": device.battery_pct,
        "device_status": device.status,
        "risk_score": pred_result["risk_score"],
        "risk_level": pred_result["risk_level"],
        "validation_flags": validation_flags,
        "alert_triggered": bool(alert),
        "alert": alert,
        "reading": reading,
        "prediction": prediction,
        "pred_result": pred_result
    }


@router.post("/ingest", response_model=IoTIngestResponse, status_code=status.HTTP_201_CREATED)
def ingest_iot_reading(
    payload: IoTIngestPayload,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
):
    """
    Ingests real-time hydrological and meteorological field readings from field IoT devices.
    Validates physical parameters, checks authentication, logs device health, and triggers predictions.
    """
    receipt = ingest_sensor_payload(db=db, payload=payload, header_api_key=x_api_key)
    return receipt


@router.get("/devices", response_model=List[SensorDeviceOut])
def get_all_devices(db: Session = Depends(get_db)):
    """Returns all registered IoT sensor stations and their operational health."""
    devices = db.query(SensorDevice).all()
    # Mark stale if last seen > 10 minutes ago
    now = datetime.utcnow()
    for d in devices:
        if d.last_seen_at and (now - d.last_seen_at).total_seconds() > 600:
            if d.status == "ONLINE":
                d.status = "STALE"
    return devices


@router.get("/devices/{location_id}", response_model=SensorDeviceOut)
def get_location_device(location_id: int, db: Session = Depends(get_db)):
    """Returns the primary IoT telemetry hardware unit monitoring a given station."""
    device = db.query(SensorDevice).filter(SensorDevice.location_id == location_id).first()
    if not device:
        # Create a default device if not seeded
        loc = db.query(Location).filter(Location.id == location_id).first()
        if not loc:
            raise HTTPException(status_code=404, detail="Location not found")
        device = SensorDevice(
            device_id=f"HIM-HYDRO-{loc.id:02d}",
            location_id=loc.id,
            api_key=f"fg_live_{loc.id:02d}",
            name=f"{loc.name} Integrated Hydro & Radar Unit",
            device_type="RADAR_STAGE_COMBO",
            last_seen_at=datetime.utcnow(),
            battery_pct=94.5,
            status="ONLINE"
        )
        db.add(device)
        db.commit()
        db.refresh(device)
    return device
