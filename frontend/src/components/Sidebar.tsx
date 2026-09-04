'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  LayoutDashboard,
  Bell,
  PlayCircle,
  MapPin,
  Waves,
  Activity,
  Radio,
  ChevronRight,
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Cpu,
  Send
} from 'lucide-react';
import { fetchLocations } from '@/lib/api';
import { Location } from '@/lib/types';
import { getRiskBadgeClasses } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    fetchLocations()
      .then(setLocations)
      .catch((err) => console.error('Sidebar fetch error:', err));
  }, [pathname]);

  const navItems = [
    { label: 'Overview Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Alert History & Log', href: '/alerts', icon: Bell },
    { label: 'SMS Emergency Dispatch', href: '/sms', icon: Send },
    { label: 'AI Model & Accuracy', href: '/model-accuracy', icon: BarChart3 },
    { label: 'Simulation Control', href: '/simulate', icon: PlayCircle },
  ];

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-[#1f293d] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#1f293d] flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
            <ShieldAlert className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-lg text-white tracking-wide">FloodGuard</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Himalayan Early Warning</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
          Operations
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161f36]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Monitored Basins Quick List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 border-t border-[#1f293d]">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Monitored Stations ({locations.length})
          </span>
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
        </div>
        <div className="space-y-1">
          {locations.map((loc) => {
            const isActive = pathname === `/location/${loc.id}`;
            const riskLevel = loc.latest_prediction?.risk_level || 'NORMAL';
            const riskScore = loc.latest_prediction?.risk_score || 10;

            return (
              <Link
                key={loc.id}
                href={`/location/${loc.id}`}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                  isActive
                    ? 'bg-slate-800/80 text-white font-semibold border border-slate-600'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161f36]'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Waves className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  <span className="truncate">{loc.name.split('/')[0].trim()}</span>
                </div>
                <div className="flex items-center space-x-1.5 flex-shrink-0 ml-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${getRiskBadgeClasses(
                      riskLevel
                    )}`}
                  >
                    {riskLevel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-[#1f293d] bg-[#0a0f1c]">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-slate-300">Live Telemetry (5s)</span>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            SIH 2026
          </span>
        </div>
      </div>
    </aside>
  );
}
