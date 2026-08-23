from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Alert
from app.schemas import AlertOut
from app.services.alert_service import get_recent_alerts

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Decision Support"])

@router.get("", response_model=List[AlertOut])
def get_alerts(
    risk_level: Optional[str] = Query(None, description="Filter by risk level (WATCH, WARNING, CRITICAL, ALL)"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Fetches recent disaster warnings and operational alert logs."""
    return get_recent_alerts(db, limit=limit, risk_level=risk_level)

@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """Marks an active early warning alert as acknowledged by the disaster command center."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged = True
    db.commit()
    return {"status": "success", "alert_id": alert_id, "acknowledged": True}

@router.get("/stats")
def get_alert_statistics(db: Session = Depends(get_db)):
    """Returns summary statistics on warnings and critical alerts issued."""
    critical_count = db.query(Alert).filter(Alert.risk_level == "CRITICAL").count()
    warning_count = db.query(Alert).filter(Alert.risk_level == "WARNING").count()
    watch_count = db.query(Alert).filter(Alert.risk_level == "WATCH").count()
    total_count = db.query(Alert).count()
    unacknowledged = db.query(Alert).filter(Alert.acknowledged == False).count()

    return {
        "total_alerts": total_count,
        "critical_alerts": critical_count,
        "warning_alerts": warning_count,
        "watch_alerts": watch_count,
        "unacknowledged_alerts": unacknowledged
    }
