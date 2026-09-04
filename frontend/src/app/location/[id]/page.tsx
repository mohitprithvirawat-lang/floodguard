'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import RiskGauge from '@/components/Charts/RiskGauge';
import RainfallChart from '@/components/Charts/RainfallChart';
import RiverLevelChart from '@/components/Charts/RiverLevelChart';
import FeatureImportanceChart from '@/components/Charts/FeatureImportanceChart';
import ForecastTrajectoryChart from '@/components/Charts/ForecastTrajectoryChart';
import ImpactList from '@/components/ImpactList';
import HistoricalEventsPanel from '@/components/HistoricalEventsPanel';
import SensorHealthWidget from '@/components/SensorHealthWidget';
import SMSDispatchModal from '@/components/SMSDispatchModal';
import { fetchLocationDetails, fetchLocationHistory, fetchHistoricalEvents } from '@/lib/api';
import { LocationDetail, HistoricalEvent } from '@/lib/types';
import {
  Waves,
  Mountain,
  Gauge,
  Droplets,
  CloudRain,
  Compass,
  ArrowLeft,
  RefreshCw,
  Zap,
  ShieldAlert,
  AlertTriangle,
  Send,
  Sparkles,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { useRealtimeStream } from '@/lib/useWebSocket';

export default function LocationDetailPage() {
  const params = useParams();
  const locationId = Number(params?.id);

  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historicalEvents, setHistoricalEvents] = useState<HistoricalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'evacuation'>('overview');
  const [smsModalOpen, setSmsModalOpen] = useState(false);

  const { telemetry } = useRealtimeStream();

  const loadData = async () => {
    if (!locationId) return;
    try {
      const [detailRes, histRes, eventsRes] = await Promise.all([
        fetchLocationDetails(locationId),
        fetchLocationHistory(locationId, 24),
        fetchHistoricalEvents(locationId).catch(() => [])
      ]);
      setLocation(detailRes);
      setHistoryData(histRes.history || []);
      setHistoricalEvents(eventsRes || []);
    } catch (err) {
      console.error('Failed to load station detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [locationId]);

  // Sync real-time updates for this location from WebSocket
  useEffect(() => {
    if (telemetry?.locations) {
      const updated = telemetry.locations.find((l) => l.id === locationId);
      if (updated) {
        setLocation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            current_reading: updated.current_reading,
            latest_prediction: updated.latest_prediction,
            scenario: updated.scenario,
            device: (updated as any).device ? {
              ...(prev.device || {}),
              ...(updated as any).device,
              last_seen_at: new Date().toISOString()
            } : prev.device
          };
        });
      }
    }
  }, [telemetry, locationId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen text-slate-400 space-y-3">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading telemetry & hydrological data...</p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen text-slate-400 space-y-4">
        <h2 className="text-lg font-bold text-white">Monitoring Station Not Found</h2>
        <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const riskScore = location.latest_prediction?.risk_score || 0;
  const riskLevel = location.latest_prediction?.risk_level || 'NORMAL';
  const warningWindow = location.latest_prediction?.warning_window_minutes || 360;
  const contributions = location.latest_prediction?.feature_contributions || {};
  const currentReading = location.current_reading;

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-12">
      <Header
        title={`${location.name} — Early Warning Station`}
        subtitle={`${location.district} District, ${location.state} | Basin: ${location.river_name}`}
      />

      <div className="p-6 space-y-6">
        {/* Top Breadcrumb & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white">{location.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                  ID: #{location.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {location.district} &bull; {location.state} &bull; River: {location.river_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center space-x-2.5">
            <button
              onClick={() => setSmsModalOpen(true)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 ${
                riskLevel === 'CRITICAL'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                  : riskLevel === 'WARNING'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Emergency SMS</span>
            </button>

            <Link
              href="/model-accuracy"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
            >
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Model Accuracy</span>
            </Link>

            <button
              onClick={loadData}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              href={`/simulate`}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 text-xs font-bold"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate</span>
            </Link>
          </div>
        </div>

        {/* Key Station Hydrological Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#111827] border border-[#1f293d] p-3 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
              <Mountain className="w-3 h-3 text-slate-400" />
              <span>Basin Slope</span>
            </span>
            <span className="text-lg font-black text-white mt-1 block">
              {location.slope}&deg;
            </span>
            <span className="text-[10px] text-amber-400 font-medium">Steep Himalayan V-Valley</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-3 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
              <Compass className="w-3 h-3 text-slate-400" />
              <span>Elevation MSL</span>
            </span>
            <span className="text-lg font-black text-white mt-1 block">
              {location.elevation.toLocaleString()} m
            </span>
            <span className="text-[10px] text-slate-400">High Altitude Catchment</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-3 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
              <Waves className="w-3 h-3 text-cyan-400" />
              <span>River Stage</span>
            </span>
            <span className="text-lg font-black text-cyan-300 mt-1 block">
              {currentReading?.river_level.toFixed(2)} m
            </span>
            <span className="text-[10px] text-slate-400">Danger: {location.danger_river_level} m</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-3 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
              <Gauge className="w-3 h-3 text-emerald-400" />
              <span>Surge Velocity</span>
            </span>
            <span className="text-lg font-black text-white mt-1 block">
              +{currentReading?.river_level_change_rate.toFixed(2)} m/h
            </span>
            <span className="text-[10px] text-slate-400">Rate of River Rise</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-3 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
              <Droplets className="w-3 h-3 text-blue-400" />
              <span>Soil Saturation</span>
            </span>
            <span className="text-lg font-black text-blue-300 mt-1 block">
              {currentReading?.soil_moisture.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400">Antecedent Runoff Index</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-3 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
              <CloudRain className="w-3 h-3 text-purple-400" />
              <span>Rainfall (3-Hr)</span>
            </span>
            <span className="text-lg font-black text-purple-300 mt-1 block">
              {currentReading?.rainfall_3h.toFixed(1)} mm
            </span>
            <span className="text-[10px] text-slate-400">Fcst: {currentReading?.forecast_rainfall_next_3h} mm</span>
          </div>
        </div>

        {/* Real-time Field IoT Sensor Node Health */}
        <SensorHealthWidget
          device={location.device}
          stationName={location.name}
        />

        {/* Section 1: AI Risk Gauge & Explainable Factor Decomposition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col">
            <RiskGauge
              score={riskScore}
              level={riskLevel}
              warningWindowMinutes={warningWindow}
            />
          </div>
          <div className="lg:col-span-8 flex flex-col">
            <FeatureImportanceChart
              contributions={contributions}
              geotechnicalRisk={location.latest_prediction?.geotechnical_risk || location.geotechnical_risk}
              hydrologicalRisk={location.latest_prediction?.hydrological_risk || location.hydrological_risk}
              hybridRisk={location.latest_prediction?.hybrid_risk || location.hybrid_risk}
              slopeAngle={location.slope}
              soilMoisture={currentReading?.soil_moisture}
            />
          </div>
        </div>

        {/* Section 2: Future Trajectory Forecasting (+1h, +2h, +3h, +6h) */}
        <div>
          <ForecastTrajectoryChart
            locationId={location.id}
            dangerLevel={location.danger_river_level}
            riverName={location.river_name}
          />
        </div>

        {/* Section 3: Time-Series Hydrological Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col min-h-[320px]">
            <RainfallChart data={historyData} />
          </div>
          <div className="flex flex-col min-h-[320px]">
            <RiverLevelChart
              data={historyData}
              dangerLevel={location.danger_river_level}
              riverName={location.river_name}
            />
          </div>
        </div>

        {/* Section 4: Vulnerable Infrastructure & Evacuation Priority Order */}
        <div>
          <ImpactList
            infrastructure={location.infrastructure}
            riskLevel={riskLevel}
          />
        </div>

        {/* Section 5: Past Incidents Nearby (Historical Disaster Inventory) */}
        <div>
          <HistoricalEventsPanel
            events={historicalEvents}
            stationName={location.name}
          />
        </div>

        {/* Emergency SMS Broadcast Modal */}
        <SMSDispatchModal
          initialLocationId={location.id}
          initialRiskLevel={riskLevel}
          isOpen={smsModalOpen}
          onClose={() => setSmsModalOpen(false)}
        />
      </div>
    </div>
  );
}
