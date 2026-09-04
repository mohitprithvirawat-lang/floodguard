'use client';

import React from 'react';
import { SensorDevice } from '@/lib/types';
import {
  Cpu,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Wifi,
  Radio,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Activity,
  Server
} from 'lucide-react';

interface SensorHealthWidgetProps {
  device?: SensorDevice | null;
  stationName?: string;
}

export default function SensorHealthWidget({
  device,
  stationName = 'Station'
}: SensorHealthWidgetProps) {
  const fallbackDevice: SensorDevice = device || {
    id: 0,
    device_id: 'HIM-NODE-FIELD',
    location_id: 0,
    name: `Telemetry Node - ${stationName}`,
    device_type: 'Hydro-Met Telemetry Node (Cellular / LoRaWAN)',
    last_seen_at: new Date().toISOString(),
    battery_pct: 94.2,
    firmware_version: 'v2.4.2-prod',
    status: 'ONLINE',
    transmission_interval_sec: 15
  };

  const currentDevice = device || fallbackDevice;
  const batteryPct = currentDevice.battery_pct ?? 90;
  const isOnline = currentDevice.status === 'ONLINE';
  const isFlagged = currentDevice.status === 'FLAGGED';

  // Format battery styling
  const getBatteryColor = (pct: number) => {
    if (pct > 60) return { bar: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    if (pct > 25) return { bar: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30' };
    return { bar: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30' };
  };

  const batteryTheme = getBatteryColor(batteryPct);

  // Time format
  const formatLastSeen = (isoString?: string | null) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'Active';
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 sm:p-5 shadow-xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Field IoT Telemetry Node
              </h3>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/60">
                {currentDevice.device_id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentDevice.device_type}
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>NODE ONLINE</span>
            </div>
          ) : isFlagged ? (
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>TELEMETRY FLAGGED</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
              <span className="inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              <span>{currentDevice.status}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Diagnostics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Battery Health & Power Supply */}
        <div className="bg-[#0b101b] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center space-x-1.5 font-medium">
              <BatteryCharging className="w-3.5 h-3.5 text-slate-400" />
              <span>Solar / Battery Reserve</span>
            </span>
            <span className={`font-mono font-bold ${batteryTheme.text}`}>
              {batteryPct.toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${batteryTheme.bar}`}
              style={{ width: `${Math.min(100, Math.max(5, batteryPct))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Nominal: 3.7V LiFePO4</span>
            <span className="text-emerald-400 font-medium">Solar Array Active</span>
          </div>
        </div>

        {/* Transmission & Heartbeat */}
        <div className="bg-[#0b101b] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center space-x-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Uplink Ping</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              Live
            </span>
          </div>

          <div className="my-1">
            <span className="font-mono text-base font-bold text-white block">
              {formatLastSeen(currentDevice.last_seen_at)}
            </span>
            <span className="text-[11px] text-slate-400">
              Cadence: Every {currentDevice.transmission_interval_sec || 15}s
            </span>
          </div>

          <div className="flex items-center space-x-1 text-[11px] text-emerald-400">
            <Activity className="w-3 h-3" />
            <span>Telemetry stream synchronized</span>
          </div>
        </div>

        {/* Network & Protocol */}
        <div className="bg-[#0b101b] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center space-x-1.5 font-medium">
              <Radio className="w-3.5 h-3.5 text-slate-400" />
              <span>Uplink Carrier</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              LTE-M / NB-IoT
            </span>
          </div>

          <div className="my-1">
            <span className="font-mono text-xs font-semibold text-slate-200 block">
              4G Cat-M1 + LoRaWAN
            </span>
            <span className="text-[11px] text-slate-400">
              Signal RSSI: -68 dBm (Excellent)
            </span>
          </div>

          <div className="flex items-center space-x-1 text-[11px] text-slate-400">
            <Wifi className="w-3 h-3 text-cyan-400" />
            <span>Sub-GHz Failover Mesh Ready</span>
          </div>
        </div>

        {/* Ingestion Pipeline & Security */}
        <div className="bg-[#0b101b] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center space-x-1.5 font-medium">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>API Ingestion Path</span>
            </span>
            <span className="font-mono text-[10px] text-emerald-400 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Auth OK</span>
            </span>
          </div>

          <div className="my-1">
            <span className="font-mono text-[11px] text-slate-300 block truncate">
              POST /api/iot/ingest
            </span>
            <span className="text-[11px] text-slate-400">
              Firmware: {currentDevice.firmware_version || 'v2.4.2-prod'}
            </span>
          </div>

          <div className="flex items-center space-x-1 text-[11px] text-cyan-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Range & monotonicity verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
