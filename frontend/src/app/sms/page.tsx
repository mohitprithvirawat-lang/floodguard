'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import {
  fetchLocations,
  previewSMS,
  dispatchSMS,
  fetchSMSHistory,
  fetchSMSTemplates
} from '@/lib/api';
import {
  Location,
  SMSPreviewResponse,
  SMSDispatch,
  SMSTemplate
} from '@/lib/types';
import { getRiskBadgeClasses, formatDateTime } from '@/lib/utils';
import {
  Send,
  Smartphone,
  Globe,
  Users,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileText,
  Copy,
  Check,
  Building2,
  Clock,
  Search,
  RefreshCw,
  PhoneCall,
  Flame,
  MessageSquare
} from 'lucide-react';

export default function SMSBroadcastPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(1);
  const [recipientGroup, setRecipientGroup] = useState<string>('ALL');
  const [language, setLanguage] = useState<string>('BILINGUAL');
  const [safeZone, setSafeZone] = useState<string>('');
  const [preview, setPreview] = useState<SMSPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [history, setHistory] = useState<SMSDispatch[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'composer' | 'templates' | 'history'>('composer');
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadInitialData = async () => {
    try {
      const [locs, hist, tpls] = await Promise.all([
        fetchLocations(),
        fetchSMSHistory(),
        fetchSMSTemplates()
      ]);
      setLocations(locs);
      if (locs.length > 0) setSelectedLocationId(locs[0].id);
      setHistory(hist);
      setTemplates(tpls.templates || []);
    } catch (err) {
      console.error('Error loading SMS page data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadPreview = async () => {
    if (!selectedLocationId) return;
    setLoadingPreview(true);
    try {
      const res = await previewSMS({
        location_id: selectedLocationId,
        language,
        recipient_group: recipientGroup,
        safe_zone: safeZone || undefined
      });
      setPreview(res);
    } catch (err) {
      console.error('Error previewing SMS:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, [selectedLocationId, recipientGroup, language, safeZone]);

  const handleDispatch = async () => {
    if (!preview) return;
    setDispatching(true);
    try {
      const res = await dispatchSMS({
        location_id: selectedLocationId,
        recipient_group: recipientGroup,
        language,
        message_text: preview.final_sms_text,
        sample_phone: '+91 98765 43210'
      });
      setHistory((prev) => [res, ...prev]);
      setNotification({
        msg: `Broadcast dispatched to ${res.phone_numbers_count.toLocaleString()} recipients. Ref: ${res.carrier_reference}`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Error dispatching SMS:', err);
      setNotification({ msg: `Failed to broadcast SMS: ${err}`, type: 'error' });
    } finally {
      setDispatching(false);
    }
  };

  const handleCopy = () => {
    if (preview?.final_sms_text) {
      navigator.clipboard.writeText(preview.final_sms_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeLoc = locations.find((l) => l.id === selectedLocationId);
  const riskLevel = activeLoc?.latest_prediction?.risk_level || 'NORMAL';
  const totalBroadcasts = history.length;
  const totalRecipientsReached = history.reduce((sum, h) => sum + (h.phone_numbers_count || 0), 0);

  const filteredHistory = history.filter((h) => {
    const term = searchTerm.toLowerCase();
    const loc = (h.location_name || '').toLowerCase();
    const msg = h.message_text.toLowerCase();
    const ref = (h.carrier_reference || '').toLowerCase();
    const matchesSearch = loc.includes(term) || msg.includes(term) || ref.includes(term);
    const matchesLevel = historyFilter === 'ALL' || h.risk_level === historyFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-12">
      <Header
        title="Emergency SMS Broadcast & Public Early Warning Dispatch"
        subtitle="CAP-Compliant Multi-Lingual Telephony Broadcast to Residents, Pradhans & NDRF Rescue Battalions"
      />

      <div className="p-6 space-y-6 flex-1 flex flex-col">
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-[#1f293d] p-4 rounded-xl">
            <span className="text-xs uppercase font-bold text-slate-400">Total SMS Broadcasts</span>
            <h3 className="text-2xl font-black text-white mt-1">{totalBroadcasts}</h3>
            <span className="text-[11px] text-slate-400">Disaster warning transmissions</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-4 rounded-xl">
            <span className="text-xs uppercase font-bold text-slate-400">Estimated Citizens Reached</span>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">
              {totalRecipientsReached.toLocaleString()}
            </h3>
            <span className="text-[11px] text-emerald-400 font-semibold">99.4% Gateway Delivery Rate</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-4 rounded-xl">
            <span className="text-xs uppercase font-bold text-slate-400">Supported Languages</span>
            <h3 className="text-2xl font-black text-cyan-400 mt-1">English + हिंदी</h3>
            <span className="text-[11px] text-slate-400">Automatic dual-script Unicode</span>
          </div>

          <div className="bg-[#111827] border border-[#1f293d] p-4 rounded-xl">
            <span className="text-xs uppercase font-bold text-slate-400">Emergency Telephony Status</span>
            <h3 className="text-2xl font-black text-blue-400 mt-1 flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              <span>LIVE</span>
            </h3>
            <span className="text-[11px] text-slate-400">NIC / Fast2SMS National Gateway</span>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 animate-fadeIn ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-red-950/80 border-red-500 text-red-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notification.msg}</span>
          </div>
        )}

        {/* Mode Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
          {[
            { id: 'composer', label: 'Broadcast Composer', icon: Send },
            { id: 'templates', label: 'Standard CAP Templates', icon: FileText },
            { id: 'history', label: `Dispatch History Log (${history.length})`, icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Broadcast Composer */}
        {activeTab === 'composer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            {/* Left Column: Composer Controls */}
            <div className="lg:col-span-7 bg-[#111827] border border-[#1f293d] rounded-xl p-5 space-y-4 shadow-xl">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Emergency Broadcast Parameters
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure alert target, language format, and safe shelter directions
                  </p>
                </div>
                {activeLoc && (
                  <span className={`text-[10px] px-2.5 py-0.5 rounded font-black uppercase ${getRiskBadgeClasses(riskLevel)}`}>
                    {riskLevel} THREAT
                  </span>
                )}
              </div>

              {/* Station Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Select Catchment Basin / Station
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                  className="w-full bg-[#090e1a] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} — {loc.river_name} ({loc.district}, {loc.state}) [Current: {loc.latest_prediction?.risk_level || 'NORMAL'}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Stakeholder Recipient Group */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Target Stakeholder Group
                </label>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {[
                    { id: 'ALL', label: 'All Citizens & Tourists', sub: 'Mass Public Alert' },
                    { id: 'PRADHANS', label: 'Village Pradhans', sub: 'Community Wardens' },
                    { id: 'RESCUE_TEAMS', label: 'NDRF / SDRF Teams', sub: 'Search & Rescue Deployment' },
                    { id: 'DISTRICT_ADMIN', label: 'District Magistrates', sub: 'DEOC Emergency Officers' }
                  ].map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => setRecipientGroup(grp.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        recipientGroup === grp.id
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                          : 'bg-[#090e1a] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-bold block text-xs">{grp.label}</span>
                      <span className="text-[10px] text-slate-400 block">{grp.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Broadcast Language Script</span>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Unicode SMS Standard</span>
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'BILINGUAL', label: 'Bilingual (EN + हिंदी)' },
                    { id: 'HI', label: 'हिंदी (Hindi Only)' },
                    { id: 'EN', label: 'English Only' }
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setLanguage(lang.id)}
                      className={`p-2.5 rounded-lg border text-center font-bold text-xs transition-all ${
                        language === lang.id
                          ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-sm'
                          : 'bg-[#090e1a] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Shelter Override */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Designated Safe Evacuation Shelter (Optional Override)</span>
                </label>
                <input
                  type="text"
                  value={safeZone}
                  onChange={(e) => setSafeZone(e.target.value)}
                  placeholder="e.g., GMVN Elevated Complex, Govt Higher Secondary Ground"
                  className="w-full bg-[#090e1a] border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Summary Stats Strip */}
              {preview && (
                <div className="p-3 bg-[#090e1a] border border-slate-800 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Recipients</span>
                    <span className="text-base font-black text-white">{preview.estimated_recipients.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Message Characters</span>
                    <span className="text-base font-black text-cyan-300">{preview.character_count}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">SMS Parts</span>
                    <span className="text-base font-black text-purple-300">{preview.sms_parts} Segment(s)</span>
                  </div>
                </div>
              )}

              {/* Trigger Button */}
              <button
                onClick={handleDispatch}
                disabled={dispatching || !preview}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-xl active:scale-95 ${
                  riskLevel === 'CRITICAL'
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                    : riskLevel === 'WARNING'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50'
                } ${dispatching ? 'opacity-70 cursor-wait' : ''}`}
              >
                <Send className="w-4 h-4" />
                <span>{dispatching ? 'Transmitting Emergency SMS Gateway...' : 'Transmit Official Disaster SMS Broadcast'}</span>
              </button>
            </div>

            {/* Right Column: Live Smartphone Preview */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Citizen Smartphone Terminal Preview</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Smartphone Frame */}
              <div className="flex-1 bg-[#080c14] border-4 border-slate-700 rounded-3xl p-4 flex flex-col justify-between shadow-2xl relative min-h-[480px]">
                {/* Speaker Notch */}
                <div className="w-28 h-3.5 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-900 mr-2"></div>
                  <div className="w-10 h-1 bg-slate-700 rounded-full"></div>
                </div>

                {/* Simulated SMS Header */}
                <div className="bg-[#0f172a] border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center font-black text-xs">
                      FG
                    </div>
                    <div>
                      <span className="font-bold text-white block leading-tight">FLOODGUARD-GOVT</span>
                      <span className="text-[10px] text-slate-400">Emergency Alert Broadcast</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${getRiskBadgeClasses(riskLevel)}`}>
                    {riskLevel}
                  </span>
                </div>

                {/* Message Bubble */}
                <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                  {loadingPreview ? (
                    <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <div className="w-7 h-7 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                      <span className="text-xs">Generating localized emergency SMS...</span>
                    </div>
                  ) : preview ? (
                    <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-4 text-xs text-slate-100 font-sans leading-relaxed whitespace-pre-line shadow-lg">
                      {preview.final_sms_text}
                      <div className="text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between">
                        <span>Gateway: Fast2SMS / NIC Telephony</span>
                        <span>Delivered &bull; Just now</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 text-center py-16">
                      Select parameters to preview message.
                    </div>
                  )}
                </div>

                {/* Phone Bottom Home Bar */}
                <div className="w-32 h-1 bg-slate-700 rounded-full mx-auto mt-2"></div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Standard CAP Templates */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 mb-2">
              Common Alerting Protocol (CAP) compliant pre-drafted disaster response templates with bilingual localized text.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-[#111827] border border-[#1f293d] hover:border-blue-500/50 rounded-xl p-4 shadow-xl transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{tpl.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{tpl.description}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${getRiskBadgeClasses(tpl.risk_level)}`}>
                      {tpl.risk_level}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#090e1a] p-2.5 rounded-lg border border-slate-800 font-sans text-slate-200">
                      <span className="text-[10px] text-blue-400 font-bold block uppercase mb-1">English:</span>
                      {tpl.template_en}
                    </div>
                    <div className="bg-[#090e1a] p-2.5 rounded-lg border border-slate-800 font-sans text-slate-200">
                      <span className="text-[10px] text-cyan-400 font-bold block uppercase mb-1">हिंदी:</span>
                      {tpl.template_hi}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Dispatch History Log */}
        {activeTab === 'history' && (
          <div className="bg-[#111827] border border-[#1f293d] rounded-xl shadow-xl overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by station, carrier reference, or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-1.5 bg-[#0a0f1c] p-1 rounded-lg border border-slate-800 text-xs">
                {['ALL', 'CRITICAL', 'WARNING', 'WATCH', 'NORMAL'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setHistoryFilter(lvl)}
                    className={`px-3 py-1 rounded font-bold transition-all ${
                      historyFilter === lvl
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0a0f1c] text-[10px] uppercase text-slate-400 tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Station & Threat</th>
                    <th className="py-2.5 px-4">Recipient Target</th>
                    <th className="py-2.5 px-4">Numbers Sent</th>
                    <th className="py-2.5 px-4">Gateway Status</th>
                    <th className="py-2.5 px-4">Carrier Reference</th>
                    <th className="py-2.5 px-4">Message Snippet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                        No SMS dispatch records found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                          {formatDateTime(item.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{item.location_name || `#${item.location_id}`}</div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${getRiskBadgeClasses(item.risk_level)}`}>
                            {item.risk_level}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {item.recipient_group} ({item.language})
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {item.phone_numbers_count.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                            {item.status} ({item.delivery_rate}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-blue-400">
                          {item.carrier_reference}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                          {item.message_text}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
