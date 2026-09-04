'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
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
  Building2
} from 'lucide-react';
import { previewSMS, dispatchSMS, fetchLocations } from '@/lib/api';
import { Location, SMSPreviewResponse, SMSDispatch } from '@/lib/types';
import { getRiskBadgeClasses } from '@/lib/utils';

interface SMSDispatchModalProps {
  initialLocationId?: number;
  initialRiskLevel?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (dispatch: SMSDispatch) => void;
}

export default function SMSDispatchModal({
  initialLocationId,
  initialRiskLevel,
  isOpen,
  onClose,
  onSuccess
}: SMSDispatchModalProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(initialLocationId || 1);
  const [recipientGroup, setRecipientGroup] = useState<string>('ALL');
  const [language, setLanguage] = useState<string>('BILINGUAL');
  const [safeZone, setSafeZone] = useState<string>('');
  const [preview, setPreview] = useState<SMSPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<SMSDispatch | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchLocations().then((data) => {
      setLocations(data);
      if (!initialLocationId && data.length > 0) {
        setSelectedLocationId(data[0].id);
      }
    });
  }, [initialLocationId]);

  useEffect(() => {
    if (initialLocationId) {
      setSelectedLocationId(initialLocationId);
    }
  }, [initialLocationId]);

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
      console.error('Error generating SMS preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPreview();
      setDispatchResult(null);
    }
  }, [isOpen, selectedLocationId, recipientGroup, language, safeZone]);

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
      setDispatchResult(res);
      if (onSuccess) onSuccess(res);
    } catch (err) {
      console.error('Error dispatching SMS:', err);
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

  if (!isOpen) return null;

  const activeLoc = locations.find((l) => l.id === selectedLocationId);
  const riskLevel = activeLoc?.latest_prediction?.risk_level || initialRiskLevel || 'NORMAL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-blue-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 px-6 bg-[#111c35] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Emergency SMS Broadcast Center</h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                  CAP Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-Language Mass Notification & Disaster Evacuation Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two Columns */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-6 space-y-4">
            {/* Target Location Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                Target Catchment / Basin
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                className="w-full bg-[#090e1a] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.district}, {loc.state}) — {loc.river_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Stakeholder Recipient Group */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                Recipient Target Stakeholders
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'ALL', label: 'All Citizens & Tourists', sub: 'Mass Public Alert' },
                  { id: 'PRADHANS', label: 'Village Pradhans', sub: 'Community Wardens' },
                  { id: 'RESCUE_TEAMS', label: 'NDRF / SDRF Teams', sub: 'Search & Rescue' },
                  { id: 'DISTRICT_ADMIN', label: 'District Magistrates', sub: 'DEOC Control Room' }
                ].map((grp) => (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setRecipientGroup(grp.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
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

            {/* Language Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>Broadcast Language</span>
                <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span>Dual Script Unicode</span>
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
                    className={`p-2 rounded-lg border text-center font-bold text-xs transition-all ${
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

            {/* Designated Safe Shelter / Evacuation Zone */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Designated Safe Evacuation Shelter (Optional Override)</span>
              </label>
              <input
                type="text"
                value={safeZone}
                onChange={(e) => setSafeZone(e.target.value)}
                placeholder="e.g., GMVN Elevated Complex, Govt College Ground"
                className="w-full bg-[#090e1a] border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Quick Metrics Info */}
            {preview && (
              <div className="p-3 bg-[#090e1a] border border-slate-800 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Recipients</span>
                  <span className="text-sm font-black text-white">{preview.estimated_recipients.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Characters</span>
                  <span className="text-sm font-black text-cyan-300">{preview.character_count}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">SMS Segments</span>
                  <span className="text-sm font-black text-purple-300">{preview.sms_parts} Part(s)</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Smartphone Live Preview */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Live Smartphone Preview</span>
              </div>
              <button
                onClick={handleCopy}
                className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>

            {/* Smartphone Mockup */}
            <div className="flex-1 bg-[#090e1a] border-2 border-slate-700 rounded-2xl p-4 flex flex-col justify-between shadow-inner relative">
              {/* Phone Speaker Notch */}
              <div className="w-24 h-3 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-900 mr-2"></div>
                <div className="w-8 h-1 bg-slate-700 rounded-full"></div>
              </div>

              {/* Message Header Bar */}
              <div className="bg-[#111827] border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-[10px]">
                    FG
                  </div>
                  <div>
                    <span className="font-bold text-white block leading-tight">FloodGuard Emergency</span>
                    <span className="text-[10px] text-slate-400">Govt Disaster Alert Feed</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${getRiskBadgeClasses(riskLevel)}`}>
                  {riskLevel}
                </span>
              </div>

              {/* Message Bubble Content */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
                {loadingPreview ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-xs">Generating localized emergency SMS...</span>
                  </div>
                ) : preview ? (
                  <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-100 font-sans leading-relaxed whitespace-pre-line shadow-md">
                    {preview.final_sms_text}
                    <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                      <span>Gateway: Fast2SMS / NIC Telephony</span>
                      <span>Now &bull; Delivered</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 text-center py-12">
                    Select a catchment to preview message.
                  </div>
                )}
              </div>

              {/* Dispatch Status Notification if sent */}
              {dispatchResult && (
                <div className="bg-emerald-950/80 border border-emerald-500/60 p-3 rounded-xl text-xs text-emerald-300 animate-fadeIn mb-3">
                  <div className="flex items-center space-x-2 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Emergency SMS Broadcast Sent Successfully!</span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <div>
                      <span className="text-slate-400">Batch Reference: </span>
                      <span className="font-mono text-emerald-400 font-bold">{dispatchResult.carrier_reference}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Recipients Dispatched: </span>
                      <span className="font-bold">{dispatchResult.phone_numbers_count.toLocaleString()}</span> (Delivery rate: {dispatchResult.delivery_rate}%)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 bg-[#111c35] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Emergency Telephony Gateway: <strong>ACTIVE</strong></span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDispatch}
              disabled={dispatching || !preview}
              className={`px-5 py-2 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all shadow-lg active:scale-95 ${
                riskLevel === 'CRITICAL'
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40'
                  : riskLevel === 'WARNING'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
              } ${dispatching ? 'opacity-70 cursor-wait' : ''}`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{dispatching ? 'Broadcasting SMS...' : 'Dispatch Emergency Broadcast Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
