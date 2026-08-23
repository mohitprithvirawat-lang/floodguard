'use client';

import React, { useState } from 'react';
import { Alert, RiskLevel } from '@/lib/types';
import { getRiskBadgeClasses, formatDateTime } from '@/lib/utils';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Filter,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { acknowledgeAlert } from '@/lib/api';

interface AlertFeedProps {
  alerts: Alert[];
  onAcknowledge?: (id: number) => void;
  compact?: boolean;
}

export default function AlertFeed({ alerts = [], onAcknowledge, compact = false }: AlertFeedProps) {
  const [filter, setFilter] = useState<string>('ALL');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<number>>(new Set());

  const handleAck = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await acknowledgeAlert(id);
      setAcknowledgedIds((prev) => new Set(prev).add(id));
      if (onAcknowledge) onAcknowledge(id);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    return a.risk_level === filter;
  });

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl flex flex-col h-full shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Live Threat Feed
            </h3>
            <p className="text-[11px] text-slate-400">Real-time emergency early warnings</p>
          </div>
        </div>

        {/* Filter Pills */}
        {!compact && (
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
            {['ALL', 'CRITICAL', 'WARNING', 'WATCH'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[520px]">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60 mb-2" />
            <p>No active {filter !== 'ALL' ? filter : ''} alerts at this time.</p>
          </div>
        ) : (
          filtered.map((alert) => {
            const isAck = alert.acknowledged || acknowledgedIds.has(alert.id);
            const isCritical = alert.risk_level === 'CRITICAL';

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border transition-all ${
                  isCritical
                    ? 'bg-red-950/20 border-red-500/40 hover:border-red-500'
                    : alert.risk_level === 'WARNING'
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                } ${isAck ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] px-2 py-0.2 rounded font-black uppercase ${getRiskBadgeClasses(
                        alert.risk_level
                      )}`}
                    >
                      {alert.risk_level}
                    </span>
                    <span className="text-[11px] font-bold text-slate-200">
                      {alert.location_name || `Station #${alert.location_id}`}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatDateTime(alert.created_at)}
                  </span>
                </div>

                <p className="text-xs text-slate-200 font-medium mb-2 leading-relaxed">
                  {alert.message}
                </p>

                <div className="text-[11px] text-amber-200/90 bg-amber-950/40 border border-amber-900/60 p-2 rounded mb-2">
                  <span className="font-semibold text-amber-400">Action: </span>
                  {alert.action_recommended}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                  <Link
                    href={`/location/${alert.location_id}`}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
                  >
                    <span>View Station Plan</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <button
                    onClick={(e) => handleAck(alert.id, e)}
                    disabled={isAck}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      isAck
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{isAck ? 'Acknowledged' : 'Acknowledge'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {compact && (
        <div className="p-2 border-t border-slate-800 text-center bg-[#0a0f1c]">
          <Link
            href="/alerts"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center justify-center space-x-1"
          >
            <span>View Full Alert Archive</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
