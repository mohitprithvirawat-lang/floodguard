'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';
import { FEATURE_NAMES_HUMAN } from '@/lib/utils';
import { BrainCircuit, Info } from 'lucide-react';

interface FeatureImportanceChartProps {
  contributions: Record<string, number>;
}

export default function FeatureImportanceChart({ contributions = {} }: FeatureImportanceChartProps) {
  // Convert dict to sorted top factors array
  const data = Object.entries(contributions)
    .map(([key, value]) => ({
      feature: FEATURE_NAMES_HUMAN[key] || key.replace(/_/g, ' '),
      rawKey: key,
      contribution: typeof value === 'number' ? value : 0
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 6); // Top 6 most impactful factors

  // Bar colors matching importance
  const getBarColor = (index: number) => {
    switch (index) {
      case 0: return '#ef4444'; // Red (Dominant factor)
      case 1: return '#f97316'; // Orange
      case 2: return '#eab308'; // Yellow
      case 3: return '#3b82f6'; // Blue
      default: return '#64748b'; // Slate
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
        <div className="flex items-center space-x-2">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Explainable AI — Risk Factor Decomposition
            </h3>
            <p className="text-[11px] text-slate-400">
              Why this risk score? Model feature importance & relative activation
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-slate-400 text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>RF Ensemble</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[260px] mt-2">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            No factor contribution telemetry available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 35, left: 40, bottom: 5 }}
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
              <Tooltip
                formatter={(value: any) => [`${value}% Contribution`, 'Impact Weight']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="contribution" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#94a3b8', fontSize: 11, formatter: (val: any) => `${val}%` }}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
