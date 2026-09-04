'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { FEATURE_NAMES_HUMAN } from '@/lib/utils';
import { GeotechnicalRisk, HydrologicalRisk, HybridRisk } from '@/lib/types';
import {
  BrainCircuit,
  Info,
  BarChart2,
  Target,
  Mountain,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  Activity
} from 'lucide-react';

interface FeatureImportanceChartProps {
  contributions: Record<string, number>;
  geotechnicalRisk?: GeotechnicalRisk;
  hydrologicalRisk?: HydrologicalRisk;
  hybridRisk?: HybridRisk;
  slopeAngle?: number;
  soilMoisture?: number;
}

type ViewMode = 'radar' | 'bar' | 'physics';

const RADAR_COLOR = '#818cf8'; // indigo-400

const getBarColor = (index: number): string => {
  switch (index) {
    case 0: return '#ef4444';
    case 1: return '#f97316';
    case 2: return '#eab308';
    case 3: return '#3b82f6';
    default: return '#64748b';
  }
};

// Custom tooltip used by both chart types
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-semibold mb-1">{item?.payload?.feature}</p>
      <p className="text-indigo-300 font-bold">{item?.value}% <span className="text-slate-400 font-normal">contribution</span></p>
    </div>
  );
};

export default function FeatureImportanceChart({
  contributions = {},
  geotechnicalRisk,
  hydrologicalRisk,
  hybridRisk,
  slopeAngle = 35.0,
  soilMoisture = 60.0
}: FeatureImportanceChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('radar');

  const data = Object.entries(contributions)
    .map(([key, value]) => ({
      feature: FEATURE_NAMES_HUMAN[key] || key.replace(/_/g, ' '),
      rawKey: key,
      contribution: typeof value === 'number' ? Math.round(value) : 0
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 6);

  // Radar needs short axis labels to avoid clutter
  const radarData = data.map((d) => ({
    ...d,
    shortLabel: d.feature.length > 14 ? d.feature.slice(0, 13) + '…' : d.feature
  }));

  // Fallback geotechnical data if not provided directly
  const fos = geotechnicalRisk?.factor_of_safety ?? 1.25;
  const geoStatus = geotechnicalRisk?.stability_status ?? (fos >= 1.5 ? 'STABLE' : fos >= 1.2 ? 'MODERATE' : fos >= 1.0 ? 'UNSTABLE' : 'FAILURE_IMMINENT');
  const geoRiskScore = geotechnicalRisk?.geotechnical_risk_score ?? Math.round(Math.max(0, Math.min(100, ((2.0 - fos) / 1.3) * 100)));
  const hydroScore = hydrologicalRisk?.score ?? 55.0;
  const combinedScore = hybridRisk?.combined_risk_score ?? Math.round(0.65 * hydroScore + 0.35 * geoRiskScore);

  const getFosColor = (val: number) => {
    if (val >= 1.5) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (val >= 1.2) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    if (val >= 1.0) return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 mb-3 gap-2">
        <div className="flex items-center space-x-2">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span>Explainable AI — Risk Factor Decomposition</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {viewMode === 'physics'
                ? 'Physics-Guided Machine Learning (PGML) hybrid slope stability & hydrological fusion'
                : 'Why this risk score? Model feature importance & relative activation'}
            </p>
          </div>
        </div>

        {/* View Toggle + Badge */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('radar')}
              title="Radar (Spider) Chart"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'radar'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Radar</span>
            </button>
            <button
              onClick={() => setViewMode('bar')}
              title="Horizontal Bar Chart"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'bar'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Bar</span>
            </button>
            <button
              onClick={() => setViewMode('physics')}
              title="Physics-Guided Slope Stability Hybrid Model"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'physics'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mountain className="w-3.5 h-3.5 text-amber-300" />
              <span>Physics Hybrid</span>
              {fos < 1.2 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse ml-0.5" />
              )}
            </button>
          </div>

          <div className="flex items-center space-x-1 text-slate-400 text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>{viewMode === 'physics' ? 'PGML Hybrid' : 'RF Ensemble'}</span>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      {viewMode === 'physics' ? (
        <div className="space-y-4 py-1 text-slate-300 flex-1 flex flex-col justify-between">
          {/* Dual Risk Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Hydrological ML Risk */}
            <div className="bg-[#0b0f19] border border-blue-900/40 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Hydrological Risk</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  Weight: 65%
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-black text-white">{hydroScore.toFixed(1)}%</span>
                <span className="text-xs font-semibold text-blue-300">
                  {hydrologicalRisk?.level || 'WATCH'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Data-driven Random Forest calibrated on river surge velocity, 3-hour precipitation, and antecedent runoff index.
              </p>
            </div>

            {/* Card 2: Geotechnical Physics Risk */}
            <div className="bg-[#0b0f19] border border-amber-900/40 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Geotechnical Risk</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  Weight: 35%
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-black text-white">{geoRiskScore.toFixed(1)}%</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${getFosColor(fos)}`}>
                  FoS: {fos.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Infinite-Slope stability equation driven by pore-water pressure &amp; slope angle ({slopeAngle}&deg;).
              </p>
            </div>

            {/* Card 3: Combined Early Warning Outcome */}
            <div className="bg-[#0b0f19] border border-indigo-900/40 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">PGML Hybrid Decision</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Fused Score
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-black text-white">{combinedScore.toFixed(1)}%</span>
                <span className="text-xs font-bold text-indigo-300">
                  {hybridRisk?.combined_risk_level || 'WARNING'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {hybridRisk?.physics_override_applied ? (
                  <span className="text-rose-400 font-semibold">
                    Physics safety override triggered (landslide dam breach hazard).
                  </span>
                ) : (
                  'Physics-guided slope shear resistance and hydro ML predictions in dynamic equilibrium.'
                )}
              </p>
            </div>
          </div>

          {/* Factor of Safety Formula Box */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Infinite-Slope Factor of Safety Formulation</span>
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getFosColor(fos)} font-bold`}>
                STATUS: {geoStatus}
              </span>
            </div>

            {/* Formula display */}
            <div className="bg-slate-950/80 border border-slate-800/80 p-2.5 rounded text-center font-mono text-xs text-amber-200 overflow-x-auto">
              <span>FoS = [ c + (&gamma; - &gamma;<sub>w</sub>&middot;m)&middot;z&middot;cos&sup2;&beta;&middot;tan&phi; ] / [ &gamma;&middot;z&middot;sin&beta;&middot;cos&beta; ]</span>
            </div>

            {/* Dynamic Parameter Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div className="bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block">Slope Angle (&beta;):</span>
                <strong className="text-white text-xs">{geotechnicalRisk?.parameters?.slope_deg ?? slopeAngle}&deg;</strong>
              </div>
              <div className="bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block">Saturation Ratio (m):</span>
                <strong className="text-cyan-300 text-xs">{geotechnicalRisk?.parameters?.saturation_ratio_m ?? (soilMoisture / 100).toFixed(2)}</strong>
              </div>
              <div className="bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block">Cohesion (c):</span>
                <strong className="text-white text-xs">{geotechnicalRisk?.parameters?.cohesion_kpa ?? 12.0} kPa</strong>
              </div>
              <div className="bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400 block">Friction Angle (&phi;):</span>
                <strong className="text-white text-xs">{geotechnicalRisk?.parameters?.friction_angle_deg ?? 32.0}&deg;</strong>
              </div>
            </div>

            {/* Live Stress Mechanics */}
            {geotechnicalRisk?.stress_mechanics && (
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 text-slate-400">
                <span>
                  Resisting Shear Strength (&tau;<sub>f</sub>):{' '}
                  <strong className="text-emerald-400">{geotechnicalRisk.stress_mechanics.resisting_stress_kpa} kPa</strong>
                </span>
                <span>
                  Gravitational Shear Stress (&tau;<sub>d</sub>):{' '}
                  <strong className="text-rose-400">{geotechnicalRisk.stress_mechanics.driving_stress_kpa} kPa</strong>
                </span>
                <span>
                  FoS = &tau;<sub>f</sub> / &tau;<sub>d</sub> ={' '}
                  <strong className="text-white font-bold">{fos.toFixed(3)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Fusion Rationale Note */}
          <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded border border-slate-800/60 leading-relaxed">
            <span className="font-semibold text-slate-300">Physics-Guided Synthesis: </span>
            {hybridRisk?.fusion_rationale ||
              `Combines 65% Hydrological ML Risk (${hydroScore.toFixed(1)}%) with 35% Geotechnical Slope FoS Risk (${geoRiskScore.toFixed(1)}%). If slope Factor of Safety drops below 1.0, active debris collapse triggers a critical disaster alert.`}
          </div>
        </div>
      ) : (
        <>
          {/* Chart area */}
          <div className="flex-1 w-full min-h-[260px]">
            {data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No factor contribution telemetry available
              </div>
            ) : viewMode === 'radar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={radarData}
                  margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
                >
                  <PolarGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="shortLabel"
                    tick={{
                      fontSize: 10,
                      fill: '#94a3b8',
                      fontWeight: 600
                    }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: '#475569' }}
                    tickCount={5}
                    axisLine={false}
                  />
                  <Radar
                    name="Contribution"
                    dataKey="contribution"
                    stroke={RADAR_COLOR}
                    fill={RADAR_COLOR}
                    fillOpacity={0.25}
                    strokeWidth={2}
                    dot={{ r: 4, fill: RADAR_COLOR, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#a5b4fc', strokeWidth: 0 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    unit="%"
                    stroke="#64748b"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    dataKey="feature"
                    type="category"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fill: '#cbd5e1' }}
                    width={150}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="contribution"
                    radius={[0, 4, 4, 0]}
                    label={{
                      position: 'right',
                      fill: '#94a3b8',
                      fontSize: 11,
                      formatter: (val: any) => `${val}%`
                    }}
                  >
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend — only shown in radar mode */}
          {viewMode === 'radar' && data.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-x-6 gap-y-1">
              {data.map((d, i) => (
                <div key={d.rawKey} className="flex items-center space-x-2 text-[11px]">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background:
                        i === 0
                          ? '#ef4444'
                          : i === 1
                          ? '#f97316'
                          : i === 2
                          ? '#eab308'
                          : RADAR_COLOR
                    }}
                  />
                  <span className="text-slate-400 truncate">{d.feature}</span>
                  <span className="ml-auto text-slate-300 font-bold">{d.contribution}%</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
