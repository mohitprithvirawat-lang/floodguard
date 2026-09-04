'use client';

import React from 'react';
import { Infrastructure, RiskLevel } from '@/lib/types';
import {
  Users,
  GraduationCap,
  Hospital,
  Compass,
  Milestone,
  ShieldAlert,
  Mountain,
  TrendingUp,
  TrendingDown,
  Layers,
  MapPin
} from 'lucide-react';

interface ImpactListProps {
  infrastructure: Infrastructure[];
  riskLevel: RiskLevel | string;
}

export default function ImpactList({ infrastructure = [], riskLevel }: ImpactListProps) {
  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hospital':
        return <Hospital className="w-4 h-4 text-rose-400" />;
      case 'school':
        return <GraduationCap className="w-4 h-4 text-amber-400" />;
      case 'village':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'bridge':
        return <Compass className="w-4 h-4 text-cyan-400" />;
      case 'road':
      default:
        return <Milestone className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'WATCH':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'NORMAL':
      default:
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
  };

  const isHighRisk = riskLevel === 'CRITICAL' || riskLevel === 'WARNING';

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Ward & Village Micro-Impact Assessment
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Layers className="w-3 h-3 mr-1" />
                Downscaled Physics + DEM
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Station ML risk dynamically adjusted per settlement via elevation relief, slope gradient, river proximity & structure exposure
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-300 font-mono">
            {infrastructure.length} Assets Downscaled
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0a0f1c] text-[10px] uppercase text-slate-400 tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Priority</th>
              <th className="py-2.5 px-3">Settlement / Asset</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Proximity & Micro-Terrain</th>
              <th className="py-2.5 px-3">Population</th>
              <th className="py-2.5 px-3">Downscaled Risk Score</th>
              <th className="py-2.5 px-3">Evacuation Directive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {infrastructure.map((item) => {
              const itemRiskLevel = item.downscaled_risk_level || riskLevel;
              const isItemCritical = itemRiskLevel === 'CRITICAL';
              const isItemWarning = itemRiskLevel === 'WARNING';
              const isPriorityOne = item.evacuation_priority === 1 && (isHighRisk || isItemCritical || isItemWarning);
              const score = item.downscaled_risk_score ?? item.vulnerability_score;
              const delta = item.downscaled_delta;

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isPriorityOne
                      ? 'bg-red-500/10 border-l-2 border-red-500'
                      : isItemCritical
                      ? 'bg-red-500/5'
                      : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        isPriorityOne
                          ? 'bg-red-500 text-white shadow-md animate-pulse'
                          : item.evacuation_priority <= 3
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{item.evacuation_priority}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-semibold text-white flex items-center space-x-1.5">
                      <span>{item.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      {item.elevation != null && (
                        <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                          <Mountain className="w-2.5 h-2.5 mr-1 text-slate-400" />
                          {Math.round(item.elevation)}m MSL
                        </span>
                      )}
                      {item.slope != null && (
                        <span className="inline-flex items-center text-[10px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                          {item.slope.toFixed(1)}° slope
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-1.5 capitalize">
                      {getIcon(item.type)}
                      <span>{item.type}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-1 text-slate-200 font-mono text-[11px]">
                      <MapPin className="w-3 h-3 text-sky-400" />
                      <span>{item.distance_km} km to river</span>
                    </div>
                    {item.downscaling_factors && (
                      <div className="text-[9px] text-slate-500 mt-1 flex flex-wrap gap-1">
                        <span>dist: {item.downscaling_factors.distance_factor >= 0 ? `+${item.downscaling_factors.distance_factor.toFixed(1)}%` : `${item.downscaling_factors.distance_factor.toFixed(1)}%`}</span>
                        <span>• elev: {item.downscaling_factors.elevation_factor >= 0 ? `+${item.downscaling_factors.elevation_factor.toFixed(1)}%` : `${item.downscaling_factors.elevation_factor.toFixed(1)}%`}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono">
                    {item.population_estimate ? (
                      <span className="font-bold text-amber-300">
                        {item.population_estimate.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center justify-between space-x-2">
                        <span className="font-mono font-bold text-[12px] text-white">
                          {score.toFixed(1)}%
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${getRiskBadge(itemRiskLevel)}`}>
                          {itemRiskLevel}
                        </span>
                      </div>
                      <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            score > 70
                              ? 'bg-red-500'
                              : score > 45
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                        />
                      </div>
                      {delta !== undefined && delta !== null && (
                        <div className="flex items-center text-[10px] font-mono">
                          {delta > 0 ? (
                            <span className="text-rose-400 flex items-center font-medium">
                              <TrendingUp className="w-3 h-3 mr-0.5" />
                              +{delta.toFixed(1)}% vs station
                            </span>
                          ) : delta < 0 ? (
                            <span className="text-emerald-400 flex items-center font-medium">
                              <TrendingDown className="w-3 h-3 mr-0.5" />
                              {delta.toFixed(1)}% vs station
                            </span>
                          ) : (
                            <span className="text-slate-400">0.0% vs station</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-[11px] text-slate-300 max-w-xs">
                    <span
                      className={
                        isItemCritical
                          ? 'text-red-300 font-semibold'
                          : isItemWarning
                          ? 'text-amber-300 font-medium'
                          : 'text-slate-300'
                      }
                    >
                      {item.recommended_action}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

