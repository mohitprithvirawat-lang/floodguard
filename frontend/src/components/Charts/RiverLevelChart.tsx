'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { formatTime } from '@/lib/utils';
import { Waves, TrendingUp } from 'lucide-react';

interface RiverLevelChartProps {
  data: any[];
  dangerLevel: number;
  riverName: string;
}

export default function RiverLevelChart({ data, dangerLevel = 8.0, riverName }: RiverLevelChartProps) {
  const chartData = (data || []).map((d) => ({
    time: formatTime(d.timestamp),
    'River Stage (m)': d.river_level || 0,
    'Surge Rate (m/h)': d.river_level_change_rate || 0
  }));

  const latest = chartData[chartData.length - 1];
  const isAboveDanger = latest && latest['River Stage (m)'] >= dangerLevel;

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Waves className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            River Hydrology Trend — {riverName}
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Danger Mark:</span>
          <span className="font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-800/50">
            {dangerLevel.toFixed(1)} m
          </span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRiver" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isAboveDanger ? '#ef4444' : '#06b6d4'} stopOpacity={0.8} />
                <stop offset="95%" stopColor={isAboveDanger ? '#ef4444' : '#06b6d4'} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis
              stroke="#64748b"
              domain={[0, Math.ceil(Math.max(dangerLevel + 2, 10))]}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

            {/* Red Danger Mark Reference Line */}
            <ReferenceLine
              y={dangerLevel}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: `Danger Level (${dangerLevel}m)`,
                fill: '#ef4444',
                fontSize: 10,
                position: 'insideTopRight'
              }}
            />

            <Area
              type="monotone"
              dataKey="River Stage (m)"
              stroke={isAboveDanger ? '#ef4444' : '#06b6d4'}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorRiver)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
