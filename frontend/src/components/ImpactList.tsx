'use client';

import React from 'react';
import { Infrastructure, RiskLevel } from '@/lib/types';
import {
  Users,
  Building2,
  GraduationCap,
  Hospital,
  Compass,
  Milestone,
  AlertCircle,
  ShieldAlert
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

  const isHighRisk = riskLevel === 'CRITICAL' || riskLevel === 'WARNING';

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Vulnerable Infrastructure & Evacuation Priority Order
            </h3>
            <p className="text-[11px] text-slate-400">
              Ranked by distance, population exposure, and structural river proximity
            </p>
          </div>
        </div>
        <span className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-300 font-mono">
          {infrastructure.length} Assets Monitored
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-[#0a0f1c] text-[10px] uppercase text-slate-400 tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Priority</th>
              <th className="py-2.5 px-3">Asset / Settlement</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Proximity</th>
              <th className="py-2.5 px-3">Population</th>
              <th className="py-2.5 px-3">Vulnerability</th>
              <th className="py-2.5 px-3">Directives / Evacuation Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {infrastructure.map((item) => {
              const isPriorityOne = item.evacuation_priority === 1 && isHighRisk;

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    isPriorityOne ? 'bg-red-500/10 border-l-2 border-red-500' : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                        item.evacuation_priority === 1
                          ? 'bg-red-500 text-white shadow-md'
                          : item.evacuation_priority <= 3
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{item.evacuation_priority}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-white">
                    {item.name}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-1.5 capitalize">
                      {getIcon(item.type)}
                      <span>{item.type}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    {item.distance_km} km
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
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.vulnerability_score > 70
                              ? 'bg-red-500'
                              : item.vulnerability_score > 40
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${item.vulnerability_score}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-slate-300">
                        {item.vulnerability_score}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-300 max-w-xs">
                    <span className={isHighRisk ? 'text-red-300 font-medium' : 'text-slate-400'}>
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
