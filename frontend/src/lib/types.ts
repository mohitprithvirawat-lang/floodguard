export type RiskLevel = 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';

export interface SensorReading {
  id: number;
  location_id: number;
  timestamp: string;
  rainfall_1h: number;
  rainfall_3h: number;
  rainfall_6h: number;
  rainfall_24h: number;
  temperature: number;
  humidity: number;
  river_level: number;
  river_level_change_rate: number;
  soil_moisture: number;
  distance_from_river: number;
  forecast_rainfall_next_3h: number;
}

export interface GeotechnicalRisk {
  factor_of_safety: number;
  stability_status: 'STABLE' | 'MODERATE' | 'UNSTABLE' | 'FAILURE_IMMINENT' | string;
  geotechnical_risk_score: number;
  geotechnical_risk_level: RiskLevel | string;
  weight: number;
  source?: string;
  parameters?: {
    slope_deg: number;
    soil_moisture_pct: number;
    saturation_ratio_m: number;
    cohesion_kpa: number;
    friction_angle_deg: number;
    soil_unit_weight_kn_m3: number;
    water_unit_weight_kn_m3: number;
    failure_depth_z_m: number;
  };
  stress_mechanics?: {
    resisting_stress_kpa: number;
    driving_stress_kpa: number;
    cohesion_contribution_kpa: number;
    frictional_contribution_kpa: number;
  };
}

export interface HydrologicalRisk {
  score: number;
  level: RiskLevel | string;
  weight: number;
  source?: string;
}

export interface HybridRisk {
  combined_risk_score: number;
  combined_risk_level: RiskLevel | string;
  physics_override_applied?: boolean;
  fusion_rationale?: string;
}

export interface RiskPrediction {
  id?: number;
  location_id: number;
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  warning_window_minutes: number;
  feature_contributions: Record<string, number>;
  hydrological_risk?: HydrologicalRisk;
  geotechnical_risk?: GeotechnicalRisk;
  hybrid_risk?: HybridRisk;
}

export interface Infrastructure {
  id: number;
  location_id: number;
  name: string;
  type: 'village' | 'road' | 'bridge' | 'school' | 'hospital';
  lat: number;
  lng: number;
  population_estimate?: number | null;
  distance_km: number;
  elevation?: number | null;
  slope?: number | null;
  downscaled_risk_score?: number;
  downscaled_risk_level?: RiskLevel | string;
  downscaled_delta?: number;
  downscaling_factors?: {
    distance_factor: number;
    elevation_factor: number;
    slope_factor: number;
    structural_factor: number;
    surge_factor: number;
  } | null;
  vulnerability_score: number;
  evacuation_priority: number;
  recommended_action: string;
}

export interface Alert {
  id: number;
  location_id: number;
  location_name?: string;
  district?: string;
  state?: string;
  risk_level: RiskLevel;
  message: string;
  action_recommended: string;
  created_at: string;
  acknowledged: boolean;
}

export interface HistoricalEvent {
  id: number;
  location_id: number;
  event_date: string;
  event_type: 'flash_flood' | 'landslide' | 'cloudburst' | string;
  trigger_rainfall_mm?: number | null;
  river_level_at_peak?: number | null;
  casualties?: number | null;
  description: string;
  source_citation: string;
}

export interface Location {
  id: number;
  name: string;
  lat: number;
  lng: number;
  district: string;
  state: string;
  slope: number;
  elevation: number;
  river_name: string;
  danger_river_level: number;
  scenario: 'NORMAL' | 'BUILDING_STORM' | 'FLASH_FLOOD_IMMINENT' | 'CLOUDBURST' | string;
  current_reading?: SensorReading | null;
  latest_prediction?: RiskPrediction | null;
}

export interface SensorDevice {
  id: number;
  device_id: string;
  location_id: number;
  name: string;
  device_type: string;
  last_seen_at?: string | null;
  battery_pct?: number | null;
  firmware_version?: string | null;
  status: 'ONLINE' | 'STALE' | 'FAULT' | 'FLAGGED' | string;
  transmission_interval_sec?: number | null;
}

export interface LocationDetail extends Location {
  infrastructure: Infrastructure[];
  readings_history: SensorReading[];
  recent_alerts: Alert[];
  device?: SensorDevice | null;
  hydrological_risk?: HydrologicalRisk;
  geotechnical_risk?: GeotechnicalRisk;
  hybrid_risk?: HybridRisk;
}

export interface RiskStationMapItem {
  id: number;
  name: string;
  lat: number;
  lng: number;
  district: string;
  state: string;
  river_name: string;
  elevation: number;
  slope: number;
  danger_river_level: number;
  scenario: string;
  risk_score: number;
  risk_level: RiskLevel;
  warning_window_minutes: number;
  color: string;
  rainfall_1h: number;
  rainfall_3h: number;
  river_level: number;
  river_level_change_rate: number;
  soil_moisture: number;
  forecast_rainfall_next_3h: number;
  top_risk_driver: string;
  hydrological_risk?: HydrologicalRisk;
  geotechnical_risk?: GeotechnicalRisk;
  hybrid_risk?: HybridRisk;
}

export interface SimulationStatus {
  status: string;
  active_scenario_counts: Record<string, number>;
  tick_count: number;
  total_locations: number;
  critical_zones: number;
  warning_zones: number;
  watch_zones: number;
  normal_zones: number;
}

export interface LiveTelemetryPayload {
  timestamp: string;
  tick: number;
  summary: {
    total_locations: number;
    critical_zones: number;
    warning_zones: number;
    watch_zones: number;
    normal_zones: number;
    active_alerts_count: number;
  };
  locations: Location[];
  new_alerts: Alert[];
}

export interface SMSTemplate {
  id: string;
  name: string;
  risk_level: string;
  description: string;
  template_en: string;
  template_hi: string;
}

export interface SMSPreviewResponse {
  location_id: number;
  location_name: string;
  risk_level: string;
  language: string;
  recipient_group: string;
  message_text_en: string;
  message_text_hi: string;
  final_sms_text: string;
  character_count: number;
  sms_parts: number;
  estimated_recipients: number;
  safe_shelter: string;
  helpline: string;
}

export interface SMSDispatch {
  id: number;
  location_id: number;
  location_name?: string;
  recipient_group: string;
  phone_numbers_count: number;
  sample_phone?: string;
  language: string;
  risk_level: string;
  message_text: string;
  status: string;
  delivery_rate: number;
  carrier_reference?: string;
  created_at: string;
}

export interface ClassMetric {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface ModelMetrics {
  model_name: string;
  total_samples: number;
  train_samples_70: number;
  test_samples_30: number;
  train_split_percentage: number;
  test_split_percentage: number;
  accuracy_percentage: number;
  macro_precision: number;
  macro_recall: number;
  macro_f1: number;
  weighted_f1: number;
  risk_score_r2: number;
  risk_score_mae: number;
  warning_window_mae_minutes: number;
  class_metrics: Record<string, ClassMetric>;
  confusion_matrix: {
    labels: string[];
    matrix: number[][];
  };
  feature_importances: Record<string, number>;
  training_timestamp: string;
}

export interface DataSourceInfo {
  source_id: string;
  name: string;
  agency: string;
  telemetry_type: string;
  update_frequency: string;
  accuracy_resolution: string;
  status: string;
  latency_seconds: number;
  description: string;
  is_live_integrated?: boolean;
  last_call_timestamp?: string | null;
  total_calls_count?: number | null;
  last_latency_ms?: number | null;
  api_endpoint?: string | null;
  sample_station_forecasts?: Record<string, string> | null;
}

export interface FutureForecastStep {
  step_hours: number;
  projected_time: string;
  projected_rainfall_1h: number;
  projected_rainfall_3h: number;
  projected_river_level: number;
  projected_risk_score: number;
  projected_risk_level: RiskLevel;
  confidence_percentage: number;
}

export interface LocationForecast {
  location_id: number;
  location_name: string;
  current_time: string;
  current_risk_score: number;
  current_risk_level: RiskLevel;
  confidence_score: number;
  forecast_steps: FutureForecastStep[];
}

