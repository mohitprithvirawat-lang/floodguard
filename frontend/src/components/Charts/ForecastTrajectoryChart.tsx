'use client';

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { fetchLocationForecast } from '@/lib/api';
import { LocationForecast, FutureForecastStep } from '@/lib/types';
import { getRiskBadgeClasses } from '@/lib/utils';
import { TrendingUp, Clock, ShieldAlert, Sparkles, Activity } from 'lucide-react';

interface ForecastTrajectoryChartProps {
  locationId: number;
  dangerLevel: number;
  riverName: string;
}

export default function ForecastTrajectoryChart({
  locationId,
  dangerLevel,
  riverName
}: ForecastTrajectoryChartProps) {
  const [forecast, setForecast] = useState<LocationForecast | null>(null);
  const [loading, setLoading] = useState(true);

  const loadForecast = async () => {
    try {
      const res = await fetchLocationForecast(locationId);
      setForecast(res);
    } catch (err) {
      console.error('Error fetching future forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (locationId) {
      loadForecast();
    }
  }, [locationId]);

  if (loading) {
    return (
      <div className="h-full min-h-[300px] bg-[#111827] border border-[#1f293d] rounded-xl p-5 flex flex-col items-center justify-center text-slate-400 space-y-2">
        <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <span className="text-xs font-medium">Calculating hydrological future trajectory (+1h to +6h)...</span>
      </div>
    );
  }

  if (!forecast || !forecast.forecast_steps || forecast.forecast_steps.length === 0) {
    return (
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 text-center text-xs text-slate-400">
        Future trajectory forecast data not available for this station.
      </div>
    );
  }

  const chartData = [
    {
      time: 'Now (0h)',
      risk_score: forecast.current_risk_score,
      river_level: undefined,
      rainfall_1h: undefined,
      confidence: forecast.confidence_score
    },
    ...forecast.forecast_steps.map((s) => ({
      time: s.projected_time,
      risk_score: s.projected_risk_score,
      river_level: s.projected_river_level,
      rainfall_1h: s.projected_rainfall_1h,
      confidence: s.confidence_percentage
    }))
  ];

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Future Risk Trajectory Forecasting (+1h, +2h, +3h, +6h)
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
              Predictive ML
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Physics-guided machine learning projection of flood surge risk and river stages
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Model Prediction Confidence:</span>
          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{forecast.confidence_score}%</span>
          </span>
        </div>
      </div>

      {/* Trajectory Timeline Cards (+1h, +2h, +3h, +6h) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {forecast.forecast_steps.map((step) => {
          const isCrit = step.projected_risk_level === 'CRITICAL';
          const isWarn = step.projected_risk_level === 'WARNING';
          return (
            <div
              key={step.step_hours}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                isCrit
                  ? 'bg-red-950/30 border-red-500/40'
                  : isWarn
                  ? 'bg-amber-950/30 border-amber-500/40'
                  : 'bg-[#090e1a] border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-300 text-[11px] flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>+{step.step_hours}h ({step.projected_time.split(' ')[0]})</span>
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${getRiskBadgeClasses(step.projected_risk_level)}`}>
                  {step.projected_risk_level}
                </span>
              </div>
              <div className="text-base font-black text-white">
                {step.projected_risk_score}%
              </div>
              <div className="text-[10px] text-slate-400 flex justify-between mt-1 pt-1 border-t border-slate-800/80">
                <span>Stage: <strong className="text-cyan-300">{step.projected_river_level}m</strong></span>
                <span>Rain: <strong className="text-purple-300">{step.projected_rainfall_1h}mm</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Forecast Line Chart */}
      <div className="h-60 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" domain={[0, 100]} fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'CRITICAL (80%)', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
            <ReferenceLine y={60} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'WARNING (60%)', fill: '#f97316', fontSize: 10, position: 'insideTopRight' }} />

            <Line
              type="monotone"
              dataKey="risk_score"
              name="Projected Risk Score (%)"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4, fill: '#ef4444' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="confidence"
              name="Confidence Level (%)"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#22c55e' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
