import {
  Location,
  LocationDetail,
  RiskStationMapItem,
  Alert,
  Infrastructure,
  SimulationStatus,
  LiveTelemetryPayload
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
