'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import {
  fetchLocations,
  updateScenario,
  triggerSimulationTick,
  resetSimulation,
  fetchSimulationStatus
} from '@/lib/api';
import { useRealtimeStream } from '@/lib/useWebSocket';
import { Location, SimulationStatus } from '@/lib/types';
import { getRiskBadgeClasses, getRiskColor } from '@/lib/utils';
import {
  PlayCircle,
  Zap,
  RefreshCw,
  RotateCcw,
  CloudRain,
  ShieldAlert,
  Sun,
  Activity,
  CheckCircle2,
  AlertOctagon,
  Waves,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function SimulatePage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const { telemetry } = useRealtimeStream();

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogMessages((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 30)]);
  };

  const loadData = async () => {
    try {
      const [locs, simStat] = await Promise.all([
        fetchLocations(),
        fetchSimulationStatus()
      ]);
      setLocations(locs);
      setStatus(simStat);
    } catch (err) {
      console.error('Failed to load simulation state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    addLog('Simulation control panel initialized. Ready for judge testing.');
  }, []);

  // Update locations from WebSocket telemetry
  useEffect(() => {
    if (telemetry?.locations) {
      setLocations(telemetry.locations);
      addLog(`Received real-time telemetry tick #${telemetry.tick}. Critical: ${telemetry.summary.critical_zones}, Warning: ${telemetry.summary.warning_zones}`);
    }
  }, [telemetry]);

  const handleGlobalScenario = async (scenario: string) => {
    setActionLoading(`global_${scenario}`);
    try {
      await updateScenario(scenario, null);
      addLog(`Global scenario set to: ${scenario}. Telemetry pushed to all stations.`);
      await loadData();
    } catch (err) {
      addLog(`Error setting global scenario: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStationScenario = async (locationId: number, scenario: string, locationName: string) => {
    setActionLoading(`station_${locationId}_${scenario}`);
    try {
      await updateScenario(scenario, locationId);
      addLog(`Station ${locationName} set to scenario: ${scenario}`);
      await loadData();
    } catch (err) {
      addLog(`Error updating station ${locationId}: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualTick = async () => {
    setActionLoading('tick');
    try {
      const res = await triggerSimulationTick();
      addLog(`Manual simulation step executed. AI predictions updated.`);
      setLocations(res.locations);
    } catch (err) {
      addLog(`Error executing tick: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async () => {
    setActionLoading('reset');
    try {
      await resetSimulation();
      addLog('All stations reset to NORMAL baseline hydrological state.');
      await loadData();
    } catch (err) {
      addLog(`Error resetting simulation: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-12">
      <Header
        title="Interactive Simulation & Judge Demonstration Center"
        subtitle="Trigger multi-scenario flash flood hazards in real-time and observe AI model reactivity"
      />

      <div className="p-6 space-y-6">
        {/* Global Preset Scenario Cards */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span>Global Catchment Presets (All 10 Himalayan Basins)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Scenario 1: Normal Safe */}
            <div className="bg-[#111827] border border-[#1f293d] hover:border-emerald-500/50 rounded-xl p-5 shadow-xl transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Sun className="w-6 h-6" />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                    Baseline
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">Normal Hydro Baseline</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Low background rain (0-5 mm), stable river stages, baseline soil moisture (30-40%). AI risk scores stay below 35%.
                </p>
              </div>

              <button
                onClick={() => handleGlobalScenario('NORMAL')}
                disabled={!!actionLoading}
                className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Apply Normal Baseline</span>
              </button>
            </div>

            {/* Scenario 2: Building Storm */}
            <div className="bg-[#111827] border border-[#1f293d] hover:border-amber-500/50 rounded-xl p-5 shadow-xl transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <CloudRain className="w-6 h-6" />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                    Warning Surge
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">Continuous Heavy Rain / Storm</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Rainfall ramp-up (30-60 mm/3h), river surge rate 0.8-1.2 m/h, soil saturation &gt;75%. Triggers WARNING status and advisories.
                </p>
              </div>

              <button
                onClick={() => handleGlobalScenario('BUILDING_STORM')}
                disabled={!!actionLoading}
                className="mt-4 w-full py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>Simulate Heavy Storm Ramp-up</span>
              </button>
            </div>

            {/* Scenario 3: Flash Flood Imminent */}
            <div className="bg-[#111827] border border-[#1f293d] hover:border-red-500/50 rounded-xl p-5 shadow-xl transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-black bg-red-500/20 text-red-400 border border-red-500/30 uppercase animate-pulse">
                    Catastrophic
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">Flash Flood Imminent</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Sustained extreme runoff (&gt;75 mm/h), river stages rising progressively past danger marks, surge +2.5 m/h. AI risk surges to &gt;85% (CRITICAL).
                </p>
              </div>

              <button
                onClick={() => handleGlobalScenario('FLASH_FLOOD_IMMINENT')}
                disabled={!!actionLoading}
                className="mt-4 w-full py-2 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-xs font-bold transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-red-950/40"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Trigger Flash Flood Imminent</span>
              </button>
            </div>

            {/* Scenario 4: Cloudburst — single-tick IMD-threshold spike */}
            <div className="bg-[#111827] border border-[#1f293d] hover:border-violet-500/50 rounded-xl p-5 shadow-xl transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                    <Zap className="w-6 h-6 animate-pulse" />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-black bg-violet-500/20 text-violet-400 border border-violet-500/30 uppercase animate-pulse">
                    Instant Spike
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">Cloudburst Micro-Burst</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Single-tick rainfall_1h spike to 100-130 mm/h (IMD cloudburst threshold). River surge &gt;3 m/h, catchment fully saturated. AI reaches CRITICAL in one step.
                </p>
              </div>

              <button
                onClick={() => handleGlobalScenario('CLOUDBURST')}
                disabled={!!actionLoading}
                className="mt-4 w-full py-2 px-3 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/40 text-xs font-bold transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-violet-950/40"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Trigger Cloudburst Spike</span>
              </button>
            </div>
          </div>
        </div>

        {/* Station-by-Station Fine Control Table */}
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Station-by-Station Granular Scenario Controller
              </h3>
              <p className="text-[11px] text-slate-400">
                Individually test any station and watch the real-time GIS dashboard & evacuation order react
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleManualTick}
                disabled={!!actionLoading}
                className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 text-xs font-bold flex items-center space-x-1.5 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Advance Tick (+1 Step)</span>
              </button>
              <button
                onClick={handleReset}
                disabled={!!actionLoading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0a0f1c] text-[10px] uppercase text-slate-400 tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Station & Basin</th>
                  <th className="py-2.5 px-3">River Stage / Danger</th>
                  <th className="py-2.5 px-3">3-Hr Rain</th>
                  <th className="py-2.5 px-3">Soil Saturation</th>
                  <th className="py-2.5 px-3">AI Risk Score</th>
                  <th className="py-2.5 px-3">Active Scenario Mode</th>
                  <th className="py-2.5 px-3">Trigger Scenario</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {locations.map((loc) => {
                  const riskLevel = loc.latest_prediction?.risk_level || 'NORMAL';
                  const riskScore = loc.latest_prediction?.risk_score || 10;
                  const currentScenario = loc.scenario || 'NORMAL';
                  const reading = loc.current_reading;

                  return (
                    <tr key={loc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-xs">{loc.name}</div>
                        <div className="text-[11px] text-slate-400">{loc.district}, {loc.state}</div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <span className={reading && reading.river_level >= loc.danger_river_level ? 'text-red-400 font-bold' : 'text-slate-200'}>
                          {reading?.river_level.toFixed(2)}m
                        </span>
                        <span className="text-slate-500"> / {loc.danger_river_level}m</span>
                      </td>

                      <td className="py-3 px-3 font-mono text-purple-300 font-semibold">
                        {reading?.rainfall_3h.toFixed(1)} mm
                      </td>

                      <td className="py-3 px-3 font-mono text-blue-300">
                        {reading?.soil_moisture.toFixed(1)}%
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-black uppercase ${getRiskBadgeClasses(
                              riskLevel
                            )}`}
                          >
                            {riskScore}% {riskLevel}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {currentScenario}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleStationScenario(loc.id, 'NORMAL', loc.name)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                              currentScenario === 'NORMAL'
                                ? 'bg-emerald-600 text-white font-black shadow-sm'
                                : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-800/50'
                            }`}
                          >
                            Normal
                          </button>

                          <button
                            onClick={() => handleStationScenario(loc.id, 'BUILDING_STORM', loc.name)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                              currentScenario === 'BUILDING_STORM'
                                ? 'bg-amber-600 text-white font-black shadow-sm'
                                : 'bg-amber-950/40 text-amber-400 hover:bg-amber-900/60 border border-amber-800/50'
                            }`}
                          >
                            Storm
                          </button>

                          <button
                            onClick={() => handleStationScenario(loc.id, 'FLASH_FLOOD_IMMINENT', loc.name)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                              currentScenario === 'FLASH_FLOOD_IMMINENT'
                                ? 'bg-red-600 text-white font-black shadow-sm animate-pulse'
                                : 'bg-red-950/40 text-red-400 hover:bg-red-900/60 border border-red-800/50'
                            }`}
                          >
                            Flash Flood
                          </button>

                          <button
                            onClick={() => handleStationScenario(loc.id, 'CLOUDBURST', loc.name)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                              currentScenario === 'CLOUDBURST'
                                ? 'bg-violet-600 text-white font-black shadow-sm animate-pulse'
                                : 'bg-violet-950/40 text-violet-400 hover:bg-violet-900/60 border border-violet-800/50'
                            }`}
                          >
                            Cloudburst
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <Link
                          href={`/location/${loc.id}`}
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Simulation Event Stream Terminal Log */}
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Simulation Engine Live Log & Telemetry Dispatch Stream
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">FastAPI WebSocket Broadcast</span>
          </div>

          <div className="bg-[#080c14] border border-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300 h-40 overflow-y-auto space-y-1">
            {logMessages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.includes('CRITICAL') || msg.includes('FLASH_FLOOD')
                    ? 'text-red-400 font-bold'
                    : msg.includes('WARNING') || msg.includes('BUILDING_STORM')
                    ? 'text-amber-300'
                    : 'text-slate-400'
                }
              >
                {msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
