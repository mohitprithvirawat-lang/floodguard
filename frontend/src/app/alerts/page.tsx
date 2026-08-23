'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { fetchAlerts, acknowledgeAlert } from '@/lib/api';
import { Alert, RiskLevel } from '@/lib/types';
import { getRiskBadgeClasses, formatDateTime } from '@/lib/utils';
import {
  Bell,
  Search,
  Filter,
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Radio,
  Check,
  Download
} from 'lucide-react';
import Link from 'next/link';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [ackState, setAckState] = useState<Set<number>>(new Set());

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts(filterLevel);
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [filterLevel]);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      setAckState((prev) => new Set(prev).add(id));
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const term = searchTerm.toLowerCase();
    const loc = (a.location_name || '').toLowerCase();
    const msg = a.message.toLowerCase();
    const act = a.action_recommended.toLowerCase();
    return loc.includes(term) || msg.includes(term) || act.includes(term);
  });

  const totalCount = alerts.length;
  const criticalCount = alerts.filter((a) => a.risk_level === 'CRITICAL').length;
  const warningCount = alerts.filter((a) => a.risk_level === 'WARNING').length;
  const unackCount = alerts.filter((a) => !a.acknowledged && !ackState.has(a.id)).length;

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-12">
      <Header
        title="Disaster Threat Alert & Operational Dispatch Log"
        subtitle="Chronological Early Warning Records & Emergency Response Actions"
      />

      <div className="p-6 space-y-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-[#1f293d] p-4 rounded-xl">
            <span className="text-xs uppercase font-bold text-slate-400">Total Warnings Logged</span>
            <h3 className="text-2xl font-black text-white mt-1">{totalCount}</h3>
            <span className="text-[11px] text-slate-400">All time simulation triggers</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-4 rounded-xl">
            <span className="text-xs uppercase font-bold text-slate-400">Critical Threat Escalations</span>
            <h3 className="text-2xl font-black text-red-400 mt-1">{criticalCount}</h3>
            <span className="text-[11px] text-red-400 font-semibold">Priority 1 Evacuations</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-4 rounded-xl">
            <span className="text-xs uppercase font-bold text-slate-400">Active Warnings</span>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{warningCount}</h3>
            <span className="text-[11px] text-amber-400 font-semibold">River Surge Advisories</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-4 rounded-xl">
            <span className="text-xs uppercase font-bold text-slate-400">Pending Acknowledgements</span>
            <h3 className="text-2xl font-black text-cyan-400 mt-1">{unackCount}</h3>
            <span className="text-[11px] text-cyan-400 font-semibold">Requires command officer signoff</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by river basin, settlement, or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center space-x-1.5 bg-[#0a0f1c] p-1 rounded-lg border border-slate-800 text-xs">
            {['ALL', 'CRITICAL', 'WARNING', 'WATCH', 'NORMAL'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 py-1.5 rounded font-bold transition-all ${
                  filterLevel === lvl
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Cards Table */}
        <div className="bg-[#111827] border border-[#1f293d] rounded-xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Threat Dispatch History ({filteredAlerts.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400">Filter: {filterLevel}</span>
          </div>

          <div className="divide-y divide-slate-800">
            {filteredAlerts.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500/50 mb-2" />
                <p>No threat records match the current filter query.</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isAck = alert.acknowledged || ackState.has(alert.id);
                const isCritical = alert.risk_level === 'CRITICAL';

                return (
                  <div
                    key={alert.id}
                    className={`p-4 transition-colors hover:bg-slate-800/30 ${
                      isCritical ? 'bg-red-950/10' : ''
                    } ${isAck ? 'opacity-70' : ''}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded font-black uppercase ${getRiskBadgeClasses(
                            alert.risk_level
                          )}`}
                        >
                          {alert.risk_level}
                        </span>
                        <span className="font-bold text-sm text-white">
                          {alert.location_name}
                        </span>
                        {alert.district && (
                          <span className="text-xs text-slate-400">
                            ({alert.district}, {alert.state})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <span className="font-mono text-slate-400">
                          {formatDateTime(alert.created_at)}
                        </span>
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={isAck}
                          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                            isAck
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 active:scale-95'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isAck ? 'Acknowledged' : 'Signoff / Acknowledge'}</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 font-medium mb-2 leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="bg-[#0a0f1c] border border-slate-800/80 p-2.5 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="text-slate-300">
                        <span className="font-bold text-amber-400">Emergency Directive: </span>
                        <span>{alert.action_recommended}</span>
                      </div>
                      <Link
                        href={`/location/${alert.location_id}`}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                      >
                        <span>View Station Telemetry</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
