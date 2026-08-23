'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Radio, Clock, RefreshCw, Zap, AlertOctagon } from 'lucide-react';
import { triggerSimulationTick } from '@/lib/api';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  activeCritical?: number;
  activeWarning?: number;
}

export default function Header({
  title = "Command Decision Support Center",
  subtitle = "Himalayan Flash Flood AI Warning & Evacuation Radar",
  activeCritical = 0,
  activeWarning = 0,
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isTickLoading, setIsTickLoading] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualTick = async () => {
    setIsTickLoading(true);
    try {
      await triggerSimulationTick();
    } catch (e) {
      console.error('Tick error:', e);
    } finally {
      setTimeout(() => setIsTickLoading(false), 500);
    }
  };

  const hasHighAlerts = activeCritical > 0 || activeWarning > 0;

  return (
    <header className="h-16 bg-[#0f172a]/95 backdrop-blur border-b border-[#1f293d] px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Title & Status */}
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
            <span>{title}</span>
            {hasHighAlerts && (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-semibold animate-pulse">
                <AlertOctagon className="w-3 h-3" />
                <span>{activeCritical} CRITICAL ZONES</span>
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      {/* Action Controls & Clock */}
      <div className="flex items-center space-x-4">
        {/* Quick Simulation Step Trigger */}
        <button
          onClick={handleManualTick}
          disabled={isTickLoading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
          title="Force one simulation step across all sensors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isTickLoading ? 'animate-spin' : ''}`} />
          <span>Step Simulation</span>
        </button>

        {/* Live Status Pill */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-medium">AI Stream Online</span>
        </div>

        {/* Real-time Clock */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timeStr || '--:--:-- IST'}</span>
        </div>
      </div>
    </header>
  );
}
