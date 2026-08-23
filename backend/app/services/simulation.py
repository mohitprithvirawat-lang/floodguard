import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models import Location, SensorReading, RiskPrediction
from app.ml.model import flood_model
from app.services.data_generator import generate_reading_for_location
from app.services.alert_service import check_and_create_alert

logger = logging.getLogger("floodguard.simulation")

class SimulationState:
    def __init__(self):
        self.tick_count: int = 0
        self.is_running: bool = True

sim_state = SimulationState()

def run_simulation_tick(db: Session) -> Dict[str, Any]:
    """
    Executes a single discrete simulation step across all stations:
    1. Steps sensors based on scenario
    2. Runs AI ML risk inference
    3. Persists readings & risk predictions
    4. Triggers alerts on escalation
    5. Returns unified real-time telemetry payload
    """
    sim_state.tick_count += 1
    locations = db.query(Location).all()
    now = datetime.utcnow()

    updated_data = []
    new_alerts = []

    for loc in locations:
        # Increment scenario step counter
        loc.scenario_step = (loc.scenario_step or 0) + 1

        # Generate sensor values
        reading_dict = generate_reading_for_location(loc, timestamp=now)

        # Create reading record
        reading = SensorReading(**reading_dict)
        db.add(reading)
        db.flush()

        # Combine reading with static terrain features for ML inference
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

        # Run AI prediction
        pred_result = flood_model.predict_risk(features)

        # Get previous prediction to detect state change
        prev_pred = db.query(RiskPrediction).filter(
            RiskPrediction.location_id == loc.id
        ).order_by(RiskPrediction.timestamp.desc()).first()

        old_level = prev_pred.risk_level if prev_pred else None

        # Save new prediction
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

        # Check for alert trigger
        alert = check_and_create_alert(
            db=db,
            location=loc,
            old_level=old_level,
            new_level=pred_result["risk_level"],
            risk_score=pred_result["risk_score"]
        )
        if alert:
            new_alerts.append({
                "id": alert.id,
                "location_id": alert.location_id,
                "location_name": loc.name,
                "district": loc.district,
                "state": loc.state,
                "risk_level": alert.risk_level,
                "message": alert.message,
                "action_recommended": alert.action_recommended,
                "created_at": alert.created_at.isoformat(),
                "acknowledged": alert.acknowledged
            })

        updated_data.append({
            "location_id": loc.id,
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
            "current_reading": {
                "id": reading.id,
                "location_id": loc.id,
                "timestamp": reading.timestamp.isoformat(),
                "rainfall_1h": reading.rainfall_1h,
                "rainfall_3h": reading.rainfall_3h,
                "rainfall_6h": reading.rainfall_6h,
                "rainfall_24h": reading.rainfall_24h,
                "temperature": reading.temperature,
                "humidity": reading.humidity,
                "river_level": reading.river_level,
                "river_level_change_rate": reading.river_level_change_rate,
                "soil_moisture": reading.soil_moisture,
                "distance_from_river": reading.distance_from_river,
                "forecast_rainfall_next_3h": reading.forecast_rainfall_next_3h
            },
            "latest_prediction": {
                "id": prediction.id,
                "location_id": loc.id,
                "timestamp": prediction.timestamp.isoformat(),
                "risk_score": prediction.risk_score,
                "risk_level": prediction.risk_level,
                "warning_window_minutes": prediction.warning_window_minutes,
                "feature_contributions": pred_result["feature_contributions"]
            }
        })

    db.commit()

    # Calculate aggregate summary stats
    total = len(updated_data)
    critical_count = sum(1 for d in updated_data if d["latest_prediction"]["risk_level"] == "CRITICAL")
    warning_count = sum(1 for d in updated_data if d["latest_prediction"]["risk_level"] == "WARNING")
    watch_count = sum(1 for d in updated_data if d["latest_prediction"]["risk_level"] == "WATCH")
    normal_count = sum(1 for d in updated_data if d["latest_prediction"]["risk_level"] == "NORMAL")

    return {
        "timestamp": now.isoformat(),
        "tick": sim_state.tick_count,
        "summary": {
            "total_locations": total,
            "critical_zones": critical_count,
            "warning_zones": warning_count,
            "watch_zones": watch_count,
            "normal_zones": normal_count,
            "active_alerts_count": critical_count + warning_count
        },
        "locations": updated_data,
        "new_alerts": new_alerts
    }

def set_location_scenario(db: Session, scenario: str, location_id: Optional[int] = None):
    """Updates the scenario state for a single location or globally."""
    query = db.query(Location)
    if location_id is not None:
        query = query.filter(Location.id == location_id)

    locations = query.all()
    for loc in locations:
        loc.scenario = scenario
        loc.scenario_step = 0

    db.commit()
    return len(locations)
