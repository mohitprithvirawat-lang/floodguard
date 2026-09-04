import {
  Location,
  LocationDetail,
  RiskStationMapItem,
  Alert,
  Infrastructure,
  SimulationStatus,
  LiveTelemetryPayload,
  HistoricalEvent
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchLocations(): Promise<Location[]> {
  const res = await fetch(`${API_BASE}/api/locations`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch locations: ${res.statusText}`);
  return res.json();
}

export async function fetchRiskMap(): Promise<{ count: number; stations: RiskStationMapItem[] }> {
  const res = await fetch(`${API_BASE}/api/risk-map`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch risk map: ${res.statusText}`);
  return res.json();
}

export async function fetchLocationDetail(id: number | string): Promise<LocationDetail> {
  const res = await fetch(`${API_BASE}/api/locations/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch location detail for #${id}: ${res.statusText}`);
  return res.json();
}

export const fetchLocationDetails = fetchLocationDetail;

export async function fetchLocationHistory(id: number | string, limit = 24): Promise<any> {
  const res = await fetch(`${API_BASE}/api/locations/${id}/history?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch history for #${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchHistoricalEvents(id: number | string): Promise<HistoricalEvent[]> {
  const res = await fetch(`${API_BASE}/api/locations/${id}/historical-events`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch historical events for #${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchImpactAssessment(id: number | string): Promise<Infrastructure[]> {
  const res = await fetch(`${API_BASE}/api/impact/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch impact assessment for #${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchAlerts(riskLevel?: string): Promise<Alert[]> {
  const url = riskLevel && riskLevel !== 'ALL'
    ? `${API_BASE}/api/alerts?risk_level=${riskLevel}`
    : `${API_BASE}/api/alerts`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.statusText}`);
  return res.json();
}

export async function acknowledgeAlert(alertId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Failed to acknowledge alert #${alertId}`);
  return res.json();
}

export async function updateScenario(scenario: string, locationId?: number | null): Promise<any> {
  const res = await fetch(`${API_BASE}/api/simulate/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario,
      location_id: locationId ?? null
    })
  });
  if (!res.ok) throw new Error(`Failed to set scenario: ${res.statusText}`);
  return res.json();
}

export async function triggerSimulationTick(): Promise<LiveTelemetryPayload> {
  const res = await fetch(`${API_BASE}/api/simulate/tick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Failed to trigger simulation tick: ${res.statusText}`);
  return res.json();
}

export async function resetSimulation(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/simulate/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Failed to reset simulation: ${res.statusText}`);
  return res.json();
}

export async function fetchSimulationStatus(): Promise<SimulationStatus> {
  const res = await fetch(`${API_BASE}/api/simulate/status`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch simulation status: ${res.statusText}`);
  return res.json();
}

// ML Model Metrics (70-30 Split, Accuracy, Confusion Matrix)
export async function fetchModelMetrics(): Promise<import('./types').ModelMetrics> {
  const res = await fetch(`${API_BASE}/api/ml/metrics`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ML metrics: ${res.statusText}`);
  return res.json();
}

// Official Hydrological & Meteorological Data Sources (IMD, CWC, ISRO, Open-Meteo)
export async function fetchDataSources(): Promise<import('./types').DataSourceInfo[]> {
  const res = await fetch(`${API_BASE}/api/ml/data-sources`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch data sources: ${res.statusText}`);
  return res.json();
}

// Future Trajectory Forecasting (+1h, +2h, +3h, +6h)
export async function fetchLocationForecast(locationId: number | string): Promise<import('./types').LocationForecast> {
  const res = await fetch(`${API_BASE}/api/locations/${locationId}/forecast`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch forecast for #${locationId}: ${res.statusText}`);
  return res.json();
}

// Emergency SMS Broadcast APIs
export async function previewSMS(payload: {
  location_id: number;
  language?: string;
  recipient_group?: string;
  safe_zone?: string;
  custom_instruction?: string;
}): Promise<import('./types').SMSPreviewResponse> {
  const res = await fetch(`${API_BASE}/api/sms/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to preview emergency SMS: ${res.statusText}`);
  return res.json();
}

export async function dispatchSMS(payload: {
  location_id: number;
  recipient_group: string;
  language: string;
  message_text: string;
  sample_phone?: string;
}): Promise<import('./types').SMSDispatch> {
  const res = await fetch(`${API_BASE}/api/sms/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to dispatch emergency SMS: ${res.statusText}`);
  return res.json();
}

export async function fetchSMSHistory(locationId?: number): Promise<import('./types').SMSDispatch[]> {
  const url = locationId ? `${API_BASE}/api/sms/history?location_id=${locationId}` : `${API_BASE}/api/sms/history`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch SMS history: ${res.statusText}`);
  return res.json();
}

export async function fetchSMSTemplates(): Promise<{ count: number; templates: import('./types').SMSTemplate[] }> {
  const res = await fetch(`${API_BASE}/api/sms/templates`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch SMS templates: ${res.statusText}`);
  return res.json();
}

