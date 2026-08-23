from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Alert, Location

def generate_alert_message(location_name: str, river_name: str, old_level: str, new_level: str, risk_score: float) -> tuple[str, str]:
    """Generates standardized operational alert text and actionable instructions."""
    if new_level == "CRITICAL":
        msg = f"CRITICAL FLASH FLOOD THREAT: {location_name} basin ({river_name}) risk index surged to {risk_score}%. Cloudburst runoff & river overtopping imminent."
        rec = "Execute Priority-1 evacuation immediately. Sound regional sirens, close bridges & mountain roads, deploy SDRF emergency response teams."
    elif new_level == "WARNING":
        msg = f"WARNING ALERT: Rapid hydrological surge detected at {location_name} on {river_name}. Risk index elevated to {risk_score}%."
        rec = "Put emergency relief camps on high alert. Stage rescue craft, suspend riverside tourism, alert village heads & district magistrates."
    elif new_level == "WATCH":
        msg = f"ADVISORY WATCH: Moderate rainfall accumulation and rising river stage at {location_name}. Risk index at {risk_score}%."
        rec = "Increase telemetry polling frequency to 1-minute intervals. Monitor tributary runoff and inform local community disaster wardens."
    else:  # NORMAL (Recovery)
        msg = f"RECOVERY NOTICE: Hydrological parameters returning to safe thresholds at {location_name} ({river_name}). Current risk index {risk_score}%."
        rec = "Maintain routine hydrological watch. Assess residual embankment damage if any."

    return msg, rec

def check_and_create_alert(
    db: Session,
    location: Location,
    old_level: Optional[str],
    new_level: str,
    risk_score: float
) -> Optional[Alert]:
    """
    Creates an alert record if there is a level escalation, significant change,
    or active warning state.
    """
    if old_level is None:
        # Initial seed/startup check
        if new_level in ["WARNING", "CRITICAL"]:
            msg, rec = generate_alert_message(location.name, location.river_name, "NORMAL", new_level, risk_score)
            alert = Alert(
                location_id=location.id,
                risk_level=new_level,
                message=msg,
                action_recommended=rec,
                created_at=datetime.utcnow()
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            return alert
        return None

    if old_level != new_level:
        msg, rec = generate_alert_message(location.name, location.river_name, old_level, new_level, risk_score)
        alert = Alert(
            location_id=location.id,
            risk_level=new_level,
            message=msg,
            action_recommended=rec,
            created_at=datetime.utcnow()
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    return None

def get_recent_alerts(db: Session, limit: int = 50, risk_level: Optional[str] = None) -> List[Dict[str, Any]]:
    query = db.query(Alert, Location).join(Location, Alert.location_id == Location.id)
    if risk_level and risk_level != "ALL":
        query = query.filter(Alert.risk_level == risk_level)

    results = query.order_by(Alert.created_at.desc()).limit(limit).all()

    alerts_out = []
    for alert, loc in results:
        alerts_out.append({
            "id": alert.id,
            "location_id": alert.location_id,
            "location_name": loc.name,
            "district": loc.district,
            "state": loc.state,
            "risk_level": alert.risk_level,
            "message": alert.message,
            "action_recommended": alert.action_recommended,
            "created_at": alert.created_at,
            "acknowledged": alert.acknowledged
        })
    return alerts_out
