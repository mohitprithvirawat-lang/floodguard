'use client';

import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Waves,
  Users,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Location } from '@/lib/types';

interface StatCardsProps {
  locations: Location[];
}

export default function StatCards({ locations }: StatCardsProps) {
  const total = locations.length;
  const criticalCount = locations.filter(
    (l) => l.latest_prediction?.risk_level === 'CRITICAL'
  ).length;
  const warningCount = locations.filter(
    (l) => l.latest_prediction?.risk_level === 'WARNING'
  ).length;
  const watchCount = locations.filter(
    (l) => l.latest_prediction?.risk_level === 'WATCH'
  ).length;
  const normalCount = locations.filter(
    (l) => l.latest_prediction?.risk_level === 'NORMAL'
  ).length;

  // Calculate highest river surge rate and rainfall
  let maxSurgeRate = 0;
  let maxSurgeLocation = '';
  let maxRain3h = 0;

  locations.forEach((loc) => {
    const rate = loc.current_reading?.river_level_change_rate || 0;
    const r3h = loc.current_reading?.rainfall_3h || 0;
    if (rate > maxSurgeRate) {
      maxSurgeRate = rate;
      maxSurgeLocation = loc.name.split('/')[0];
    }
    if (r3h > maxRain3h) {
      maxRain3h = r3h;
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Monitored Stations */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Monitored Stations
            </p>
            <h3 className="text-2xl font-black text-white mt-1">{total}</h3>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{normalCount} Normal | {watchCount} Watch</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Critical Flash Flood Zones */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Critical Risk Zones
            </p>
            <h3 className="text-2xl font-black text-red-400 mt-1 flex items-baseline space-x-1">
              <span>{criticalCount}</span>
              <span className="text-xs font-normal text-slate-400">basins</span>
            </h3>
            <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1 font-medium">
              <ShieldAlert className="w-3 h-3" />
              <span>{criticalCount > 0 ? 'Mandatory Evacuation Orders' : 'No Critical Surge'}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <ShieldAlert className={`w-6 h-6 ${criticalCount > 0 ? 'animate-bounce' : ''}`} />
          </div>
        </div>
        <div className="mt-3 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className="bg-red-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (criticalCount / Math.max(total, 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Active Warnings */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Warnings
            </p>
            <h3 className="text-2xl font-black text-amber-400 mt-1 flex items-baseline space-x-1">
              <span>{warningCount}</span>
              <span className="text-xs font-normal text-slate-400">zones</span>
            </h3>
            <p className="text-[11px] text-amber-400 mt-1 flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Pre-evacuation alerts deployed</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (warningCount / Math.max(total, 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Max River Surge Rate */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Peak River Surge Rate
            </p>
            <h3 className="text-2xl font-black text-cyan-400 mt-1 flex items-baseline space-x-1">
              <span>+{maxSurgeRate.toFixed(2)}</span>
              <span className="text-xs font-normal text-slate-400">m/h</span>
            </h3>
            <p className="text-[11px] text-slate-300 mt-1 truncate">
              {maxSurgeLocation ? `At ${maxSurgeLocation}` : 'Normal hydro balance'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Waves className="w-6 h-6" />
          </div>
        </div>
        <div className="mt-3 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className="bg-cyan-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (maxSurgeRate / 3.0) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
