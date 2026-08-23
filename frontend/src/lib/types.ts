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

export interface RiskPrediction {
  id?: number;
  location_id: number;
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  warning_window_minutes: number;
  feature_contributions: Record<string, number>;
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
  scenario: 'NORMAL' | 'BUILDING_STORM' | 'FLASH_FLOOD_IMMINENT';
  current_reading?: SensorReading | null;
  latest_prediction?: RiskPrediction | null;
}

export interface LocationDetail extends Location {
  infrastructure: Infrastructure[];
  readings_history: SensorReading[];
  recent_alerts: Alert[];
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
