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
import { BrainCircuit, Info, BarChart2, Target } from 'lucide-react';

interface FeatureImportanceChartProps {
  contributions: Record<string, number>;
}

type ViewMode = 'radar' | 'bar';

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

export default function FeatureImportanceChart({ contributions = {} }: FeatureImportanceChartProps) {
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
    // Shorten labels for the polygon axes
    shortLabel: d.feature.length > 14 ? d.feature.slice(0, 13) + '…' : d.feature
  }));

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Explainable AI — Risk Factor Decomposition
            </h3>
            <p className="text-[11px] text-slate-400">
              Why this risk score? Model feature importance &amp; relative activation
            </p>
          </div>
        </div>

        {/* View Toggle + badge */}
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
          </div>
          <div className="flex items-center space-x-1 text-slate-400 text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>RF Ensemble</span>
          </div>
        </div>
      </div>

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
              <PolarGrid
                stroke="#1e293b"
                strokeDasharray="3 3"
              />
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
                style={{ background: i === 0 ? '#ef4444' : i === 1 ? '#f97316' : i === 2 ? '#eab308' : RADAR_COLOR }}
              />
              <span className="text-slate-400 truncate">{d.feature}</span>
              <span className="ml-auto text-slate-300 font-bold">{d.contribution}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
