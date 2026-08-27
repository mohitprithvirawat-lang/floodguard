from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Location, RiskPrediction
from app.schemas import ScenarioUpdateRequest, SimulationStatusOut
from app.services.simulation import run_simulation_tick, set_location_scenario, sim_state
from app.routers.websocket import ws_manager

router = APIRouter(prefix="/api/simulate", tags=["Simulation Control"])

async def broadcast_tick_result(payload: dict):
    await ws_manager.broadcast_live(payload)
    for alert in payload.get("new_alerts", []):
        await ws_manager.broadcast_alert(alert)

@router.post("/scenario")
async def update_scenario(
    payload: ScenarioUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Switches scenario mode for a single station or globally.
    Immediately triggers a tick and broadcasts the new state over WebSockets.
    """
    valid_scenarios = ["NORMAL", "BUILDING_STORM", "FLASH_FLOOD_IMMINENT", "CLOUDBURST"]
    if payload.scenario not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{payload.scenario}'. Must be one of {valid_scenarios}"
        )

    count = set_location_scenario(db, payload.scenario, payload.location_id)

    # Immediately execute a simulation step to reflect the scenario change
    tick_payload = run_simulation_tick(db)
    background_tasks.add_task(broadcast_tick_result, tick_payload)

    return {
        "status": "success",
        "scenario": payload.scenario,
        "affected_locations_count": count,
        "location_id": payload.location_id,
        "tick_data": tick_payload
    }

@router.post("/tick")
async def manual_tick(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Manually advances the simulation one step and pushes real-time telemetry."""
    tick_payload = run_simulation_tick(db)
    background_tasks.add_task(broadcast_tick_result, tick_payload)
    return tick_payload

@router.get("/status", response_model=SimulationStatusOut)
def get_simulation_status(db: Session = Depends(get_db)):
    """Returns current active scenario distribution and station counts."""
    locations = db.query(Location).all()
    scenario_counts = {"NORMAL": 0, "BUILDING_STORM": 0, "FLASH_FLOOD_IMMINENT": 0, "CLOUDBURST": 0}

    for loc in locations:
        s = loc.scenario or "NORMAL"
        scenario_counts[s] = scenario_counts.get(s, 0) + 1

    # Get latest risk distribution
    crit = 0
    warn = 0
    watch = 0
    norm = 0

    for loc in locations:
        latest = db.query(RiskPrediction).filter(
            RiskPrediction.location_id == loc.id
        ).order_by(RiskPrediction.timestamp.desc()).first()

        lvl = latest.risk_level if latest else "NORMAL"
        if lvl == "CRITICAL":
            crit += 1
        elif lvl == "WARNING":
            warn += 1
        elif lvl == "WATCH":
            watch += 1
        else:
            norm += 1

    return {
        "status": "running" if sim_state.is_running else "paused",
        "active_scenario_counts": scenario_counts,
        "tick_count": sim_state.tick_count,
        "total_locations": len(locations),
        "critical_zones": crit,
        "warning_zones": warn,
        "watch_zones": watch,
        "normal_zones": norm
    }

@router.post("/reset")
async def reset_simulation(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Resets all locations to NORMAL scenario."""
    set_location_scenario(db, "NORMAL", None)
    tick_payload = run_simulation_tick(db)
    background_tasks.add_task(broadcast_tick_result, tick_payload)
    return {"status": "reset_complete", "tick_data": tick_payload}
