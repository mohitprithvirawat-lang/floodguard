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
import { CloudRain } from 'lucide-react';

interface RainfallChartProps {
  data: any[];
}

export default function RainfallChart({ data }: RainfallChartProps) {
  const chartData = (data || []).map((d) => ({
    time: formatTime(d.timestamp),
    '1-Hour Rain (mm)': d.rainfall_1h || 0,
    '3-Hour Rain (mm)': d.rainfall_3h || 0,
    'Forecast (3h) (mm)': d.forecast_rainfall_next_3h || 0,
    soilMoisture: d.soil_moisture || 0
  }));

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <CloudRain className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Precipitation & Forecast Intensity
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">Rainfall (mm) vs Time</span>
      </div>

      <div className="flex-1 w-full min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRain3h" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorRain1h" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#64748b' }} />
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

            {/* Heavy Rain / Cloudburst Warning Line */}
            <ReferenceLine y={65} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Flash Flood Trigger (65mm)', fill: '#ef4444', fontSize: 10, position: 'top' }} />

            <Area
              type="monotone"
              dataKey="3-Hour Rain (mm)"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRain3h)"
            />
            <Area
              type="monotone"
              dataKey="1-Hour Rain (mm)"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRain1h)"
            />
            <Area
              type="monotone"
              dataKey="Forecast (3h) (mm)"
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#colorForecast)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
