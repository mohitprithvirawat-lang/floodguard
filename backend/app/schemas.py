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

class GeotechnicalRiskOut(BaseModel):
    factor_of_safety: float
    stability_status: str  # STABLE, MODERATE, UNSTABLE, FAILURE_IMMINENT
    geotechnical_risk_score: float
    geotechnical_risk_level: str
    weight: float = 0.35
    source: Optional[str] = "Infinite-Slope Factor of Safety (FoS) Physics Engine"
    parameters: Optional[Dict[str, Any]] = None
    stress_mechanics: Optional[Dict[str, Any]] = None

class HydrologicalRiskOut(BaseModel):
    score: float
    level: str
    weight: float = 0.65
    source: Optional[str] = "Random Forest Hydrology Regressor"

class HybridRiskOut(BaseModel):
    combined_risk_score: float
    combined_risk_level: str
    physics_override_applied: bool = False
    fusion_rationale: Optional[str] = None

class RiskPredictionOut(BaseModel):
    id: Optional[int] = None
    location_id: int
    timestamp: datetime
    risk_score: float
    risk_level: str  # NORMAL, WATCH, WARNING, CRITICAL
    warning_window_minutes: int
    feature_contributions: Dict[str, float]
    hydrological_risk: Optional[HydrologicalRiskOut] = None
    geotechnical_risk: Optional[GeotechnicalRiskOut] = None
    hybrid_risk: Optional[HybridRiskOut] = None

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
    geotechnical_risk: Optional[GeotechnicalRiskOut] = None
    hydrological_risk: Optional[HydrologicalRiskOut] = None
    hybrid_risk: Optional[HybridRiskOut] = None
    device: Optional["SensorDeviceOut"] = None

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

# SMS Schemas
class SMSPreviewRequest(BaseModel):
    location_id: int
    language: str = "BILINGUAL"  # EN, HI, BILINGUAL
    recipient_group: str = "ALL"  # RESIDENTS, PRADHANS, RESCUE_TEAMS, DISTRICT_ADMIN, ALL
    custom_instruction: Optional[str] = None
    safe_zone: Optional[str] = None

class SMSPreviewResponse(BaseModel):
    location_id: int
    location_name: str
    risk_level: str
    language: str
    recipient_group: str
    message_text_en: str
    message_text_hi: str
    final_sms_text: str
    character_count: int
    sms_parts: int
    estimated_recipients: int
    safe_shelter: str
    helpline: str

class SMSDispatchRequest(BaseModel):
    location_id: int
    recipient_group: str = "ALL"  # RESIDENTS, PRADHANS, RESCUE_TEAMS, DISTRICT_ADMIN, ALL
    language: str = "BILINGUAL"
    message_text: str
    sample_phone: Optional[str] = "+91 98765 43210"

class SMSDispatchOut(BaseModel):
    id: int
    location_id: int
    location_name: Optional[str] = None
    recipient_group: str
    phone_numbers_count: int
    sample_phone: Optional[str] = None
    language: str
    risk_level: str
    message_text: str
    status: str
    delivery_rate: float
    carrier_reference: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ML Metrics & 70-30 Split Schemas
class ClassMetric(BaseModel):
    precision: float
    recall: float
    f1_score: float
    support: int

class ModelMetricsOut(BaseModel):
    model_name: str
    total_samples: int
    train_samples_70: int
    test_samples_30: int
    train_split_percentage: float
    test_split_percentage: float
    accuracy_percentage: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    weighted_f1: float
    risk_score_r2: float
    risk_score_mae: float
    warning_window_mae_minutes: float
    class_metrics: Dict[str, ClassMetric]
    confusion_matrix: Dict[str, Any]
    feature_importances: Dict[str, float]
    training_timestamp: str

class DataSourceInfo(BaseModel):
    source_id: str
    name: str
    agency: str
    telemetry_type: str
    update_frequency: str
    accuracy_resolution: str
    status: str
    latency_seconds: int
    description: str

class FutureForecastStep(BaseModel):
    step_hours: int
    projected_time: str
    projected_rainfall_1h: float
    projected_rainfall_3h: float
    projected_river_level: float
    projected_risk_score: float
    projected_risk_level: str
    confidence_percentage: float

class LocationForecastOut(BaseModel):
    location_id: int
    location_name: str
    current_time: str
    current_risk_score: float
    current_risk_level: str
    confidence_score: float
    forecast_steps: List[FutureForecastStep]


# Historical Disaster Inventory Schemas
class HistoricalEventOut(BaseModel):
    id: int
    location_id: int
    event_date: str
    event_type: str  # flash_flood, landslide, cloudburst
    trigger_rainfall_mm: Optional[float] = None
    river_level_at_peak: Optional[float] = None
    casualties: Optional[int] = None
    description: str
    source_citation: str

    class Config:
        from_attributes = True


# IoT Sensor Device & Ingestion Schemas
class SensorDeviceOut(BaseModel):
    id: int
    device_id: str
    location_id: int
    name: str
    device_type: str
    last_seen_at: datetime
    battery_pct: float
    firmware_version: str
    status: str  # ONLINE, STALE, FAULT
    transmission_interval_sec: int

    class Config:
        from_attributes = True


class IoTIngestPayload(BaseModel):
    api_key: Optional[str] = None
    device_id: Optional[str] = None
    location_id: Optional[int] = None
    timestamp: Optional[datetime] = None
    rainfall_1h: float = Field(..., ge=0.0, le=250.0, description="1-hour rainfall in mm (0-250)")
    rainfall_3h: float = Field(..., ge=0.0, le=500.0, description="3-hour rainfall in mm (0-500)")
    rainfall_6h: float = Field(..., ge=0.0, le=800.0, description="6-hour rainfall in mm (0-800)")
    rainfall_24h: float = Field(..., ge=0.0, le=1200.0, description="24-hour rainfall in mm (0-1200)")
    temperature: float = Field(..., ge=-30.0, le=55.0, description="Ambient temperature in °C (-30 to 55)")
    humidity: float = Field(..., ge=0.0, le=100.0, description="Relative humidity in % (0-100)")
    river_level: float = Field(..., ge=0.0, le=30.0, description="River level in meters (0-30)")
    river_level_change_rate: float = Field(..., ge=-5.0, le=12.0, description="Surge rate in m/h (-5 to 12)")
    soil_moisture: float = Field(..., ge=0.0, le=100.0, description="Soil moisture in % (0-100)")
    distance_from_river: Optional[float] = 50.0
    forecast_rainfall_next_3h: Optional[float] = 0.0
    battery_pct: Optional[float] = Field(None, ge=0.0, le=100.0)


class IoTIngestResponse(BaseModel):
    status: str  # SUCCESS, FLAGGED
    message: str
    reading_id: int
    device_id: str
    location_id: int
    location_name: str
    timestamp: datetime
    battery_pct: float
    device_status: str
    risk_score: float
    risk_level: str
    validation_flags: List[str] = []

