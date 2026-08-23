'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import StatCards from '@/components/StatCards';
import DynamicRiskMap from '@/components/Map';
import AlertFeed from '@/components/AlertFeed';
import { fetchLocations, fetchAlerts, updateScenario } from '@/lib/api';
import { useRealtimeStream } from '@/lib/useWebSocket';
import { Location, Alert, RiskStationMapItem } from '@/lib/types';
import { Zap, Play, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function OverviewPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scenarioTriggering, setScenarioTriggering] = useState<string | null>(null);

  const { telemetry, isConnected, latestAlert } = useRealtimeStream();

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [locs, alts] = await Promise.all([
          fetchLocations(),
          fetchAlerts()
        ]);
        setLocations(locs);
        setAlerts(alts);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update locations state on incoming real-time WebSocket telemetry
  useEffect(() => {
    if (telemetry?.locations && telemetry.locations.length > 0) {
      setLocations(telemetry.locations);
    }
    if (telemetry?.new_alerts && telemetry.new_alerts.length > 0) {
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newOnes = telemetry.new_alerts.filter((a) => !existingIds.has(a.id));
        return [...newOnes, ...prev];
      });
    }
  }, [telemetry]);

  const handleQuickScenario = async (scenario: string, stationId?: number) => {
    setScenarioTriggering(scenario);
    try {
      await updateScenario(scenario, stationId ?? null);
      const [locs, alts] = await Promise.all([fetchLocations(), fetchAlerts()]);
      setLocations(locs);
      setAlerts(alts);
    } catch (err) {
      console.error('Error triggering scenario:', err);
    } finally {
      setTimeout(() => setScenarioTriggering(null), 800);
    }
  };

  // Format stations for map view
  const mapStations: RiskStationMapItem[] = locations.map((loc) => {
    const riskLevel = loc.latest_prediction?.risk_level || 'NORMAL';
    const riskScore = loc.latest_prediction?.risk_score || 10;
    const warningWin = loc.latest_prediction?.warning_window_minutes || 360;
    const contribs = loc.latest_prediction?.feature_contributions || {};

    const colorMap: Record<string, string> = {
      CRITICAL: '#ef4444',
      WARNING: '#f97316',
      WATCH: '#eab308',
      NORMAL: '#22c55e'
    };

    return {
      id: loc.id,
      name: loc.name,
      lat: loc.lat,
      lng: loc.lng,
      district: loc.district,
      state: loc.state,
      river_name: loc.river_name,
      elevation: loc.elevation,
      slope: loc.slope,
      danger_river_level: loc.danger_river_level,
      scenario: loc.scenario,
      risk_score: riskScore,
      risk_level: riskLevel,
      warning_window_minutes: warningWin,
      color: colorMap[riskLevel] || '#22c55e',
      rainfall_1h: loc.current_reading?.rainfall_1h || 0,
      rainfall_3h: loc.current_reading?.rainfall_3h || 0,
      river_level: loc.current_reading?.river_level || 2.0,
      river_level_change_rate: loc.current_reading?.river_level_change_rate || 0,
      soil_moisture: loc.current_reading?.soil_moisture || 30,
      forecast_rainfall_next_3h: loc.current_reading?.forecast_rainfall_next_3h || 0,
      top_risk_driver: Object.keys(contribs)[0] || 'rainfall_3h'
    };
  });

  const criticalCount = locations.filter(
    (l) => l.latest_prediction?.risk_level === 'CRITICAL'
  ).length;
  const warningCount = locations.filter(
    (l) => l.latest_prediction?.risk_level === 'WARNING'
  ).length;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Command Overview & GIS Threat Radar"
        subtitle="Himalayan Basin Multi-Source Telemetry & Explainable AI Prediction"
        activeCritical={criticalCount}
        activeWarning={warningCount}
      />

      <div className="p-6 space-y-6 flex-1 flex flex-col">
        {/* Quick Demo Scenario Bar */}
        <div className="bg-[#111827] border border-blue-500/30 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Hackathon Demo Quick Scenarios
              </span>
              <span className="text-[11px] text-slate-400">
                Trigger real-time hydrological events to watch the AI radar react live:
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleQuickScenario('FLASH_FLOOD_IMMINENT', 2)}
              disabled={!!scenarioTriggering}
              className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-xs font-bold transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Simulate Cloudburst (Kedarnath)</span>
            </button>

            <button
              onClick={() => handleQuickScenario('BUILDING_STORM', 1)}
              disabled={!!scenarioTriggering}
              className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Storm Building (Chamoli)</span>
            </button>

            <button
              onClick={() => handleQuickScenario('NORMAL')}
              disabled={!!scenarioTriggering}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset All Safe</span>
            </button>

            <Link
              href="/simulate"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 underline"
            >
              Full Simulator &rarr;
            </Link>
          </div>
        </div>

        {/* Aggregate KPI Stat Cards */}
        <StatCards locations={locations} />

        {/* Main Grid: GIS Map (70%) + Live Alert Feed (30%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[550px]">
          {/* Spatial GIS Map */}
          <div className="lg:col-span-8 flex flex-col min-h-[500px]">
            <DynamicRiskMap stations={mapStations} />
          </div>

          {/* Real-time Alert Feed Sidebar */}
          <div className="lg:col-span-4 flex flex-col min-h-[500px]">
            <AlertFeed alerts={alerts} compact={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
