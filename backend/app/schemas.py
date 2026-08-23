from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class SensorReadingBase(BaseModel):
    rainfall_1h: float
    rainfall_3h: float
    rainfall_6h: float
    rainfall_24h: float
    temperature: float
    humidity: float
    river_level: float
    river_level_change_rate: float
    soil_moisture: float
    distance_from_river: float = 50.0
    forecast_rainfall_next_3h: float

class SensorReadingCreate(SensorReadingBase):
    location_id: int
    timestamp: Optional[datetime] = None

class SensorReadingOut(SensorReadingBase):
    id: int
    location_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class RiskPredictionOut(BaseModel):
    id: Optional[int] = None
    location_id: int
    timestamp: datetime
    risk_score: float
    risk_level: str  # NORMAL, WATCH, WARNING, CRITICAL
    warning_window_minutes: int
    feature_contributions: Dict[str, float]

    class Config:
        from_attributes = True

class InfrastructureOut(BaseModel):
    id: int
    location_id: int
    name: str
    type: str  # village, road, bridge, school, hospital
    lat: float
    lng: float
    population_estimate: Optional[int] = None
    distance_km: float
    vulnerability_score: float
    evacuation_priority: int
    recommended_action: str

    class Config:
        from_attributes = True

class AlertOut(BaseModel):
    id: int
    location_id: int
    location_name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    risk_level: str
    message: str
    action_recommended: str
    created_at: datetime
    acknowledged: bool = False

    class Config:
        from_attributes = True

class LocationBase(BaseModel):
    name: str
    lat: float
    lng: float
    district: str
    state: str
    slope: float
    elevation: float
    river_name: str
    danger_river_level: float
    scenario: str = "NORMAL"

class LocationOut(LocationBase):
    id: int
    current_reading: Optional[SensorReadingOut] = None
    latest_prediction: Optional[RiskPredictionOut] = None

    class Config:
        from_attributes = True

class LocationDetailOut(LocationOut):
    infrastructure: List[InfrastructureOut] = []
    readings_history: List[SensorReadingOut] = []
    recent_alerts: List[AlertOut] = []

class ScenarioUpdateRequest(BaseModel):
    scenario: str = Field(..., description="NORMAL, BUILDING_STORM, FLASH_FLOOD_IMMINENT")
    location_id: Optional[int] = Field(None, description="Location ID to update, or None for all locations")

class SimulationStatusOut(BaseModel):
    status: str
    active_scenario_counts: Dict[str, int]
    tick_count: int
    total_locations: int
    critical_zones: int
    warning_zones: int
    watch_zones: int
    normal_zones: int
