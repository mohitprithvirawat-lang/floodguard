'use client';

import React from 'react';
import { RiskLevel } from '@/lib/types';
import { getRiskColor, getRiskBadgeClasses } from '@/lib/utils';
import { Clock, ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel | string;
  warningWindowMinutes: number;
}

export default function RiskGauge({ score, level, warningWindowMinutes }: RiskGaugeProps) {
  const safeScore = Math.max(0, Math.min(100, score || 0));
  const color = getRiskColor(level);

  // SVG Gauge calculations
  const radius = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half-circle
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 flex flex-col items-center justify-between shadow-xl relative overflow-hidden">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          AI Risk Assessment Index
        </span>
        <span className={`text-xs px-2.5 py-0.5 rounded font-black tracking-wide uppercase ${getRiskBadgeClasses(level)}`}>
          {level}
        </span>
      </div>

      {/* SVG Arc Meter */}
      <div className="relative flex flex-col items-center justify-center my-2">
        <svg width="200" height="120" viewBox="0 0 200 120" className="overflow-visible">
          {/* Background Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Color Segments Track Indicator */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Big Number */}
        <div className="absolute top-10 flex flex-col items-center text-center">
          <span className="text-4xl font-black text-white tracking-tight" style={{ color: color }}>
            {safeScore.toFixed(1)}%
          </span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Flash Flood Probability
          </span>
        </div>
      </div>

      {/* Warning Window Countdown Footer */}
      <div className="w-full bg-[#0a0f1c] border border-slate-800/80 rounded-lg p-3 flex items-center justify-between text-xs mt-2">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300 font-medium">Estimated Reaction Window:</span>
        </div>
        <div className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
          {warningWindowMinutes > 60
            ? `${Math.floor(warningWindowMinutes / 60)}h ${warningWindowMinutes % 60}m`
            : `${warningWindowMinutes} mins`}
        </div>
      </div>
    </div>
  );
}
