'use client';

import React from 'react';
import { HistoricalEvent } from '@/lib/types';
import {
  History,
  Calendar,
  CloudRain,
  Waves,
  Users,
  BookOpen,
  CloudLightning,
  Mountain
} from 'lucide-react';

interface HistoricalEventsPanelProps {
  events: HistoricalEvent[];
  stationName?: string;
}

export default function HistoricalEventsPanel({
  events = [],
  stationName = 'Station'
}: HistoricalEventsPanelProps) {
  const getEventTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cloudburst':
        return {
          icon: <CloudLightning className="w-3.5 h-3.5 text-purple-400" />,
          label: 'Cloudburst Deluge',
          badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
        };
      case 'landslide':
        return {
          icon: <Mountain className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Landslide / Debris Flow',
          badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        };
      case 'flash_flood':
      default:
        return {
          icon: <Waves className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'Flash Flood Event',
          badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
        };
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1f293d] rounded-xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span>Past Incidents Nearby</span>
              <span className="text-[10px] lowercase font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                historical disaster inventory
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Documented historical floods, rain bursts & debris flows recorded within this catchment basin
            </p>
          </div>
        </div>
        <span className="text-xs bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-300 font-mono">
          {events.length} {events.length === 1 ? 'Record' : 'Records'} Documented
        </span>
      </div>

      {/* Events List or Empty State */}
      {events.length === 0 ? (
        <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
          <History className="w-8 h-8 opacity-30" />
          <p className="text-xs">No historical extreme flood or cloudburst incidents catalogued for {stationName}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {events.map((event) => {
            const badge = getEventTypeBadge(event.event_type);
            return (
              <div
                key={event.id}
                className="bg-[#0b0f19] border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-colors space-y-3"
              >
                {/* Event Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.badgeClass}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>

                    <span className="inline-flex items-center space-x-1 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{event.event_date}</span>
                    </span>
                  </div>

                  {/* Impact metrics chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {event.trigger_rainfall_mm !== null && event.trigger_rainfall_mm !== undefined && (
                      <div className="flex items-center space-x-1 bg-purple-950/30 border border-purple-800/40 text-purple-300 px-2 py-0.5 rounded">
                        <CloudRain className="w-3 h-3 text-purple-400" />
                        <span className="text-[11px] font-medium">
                          Rainfall: <strong className="font-bold">{event.trigger_rainfall_mm} mm</strong>
                        </span>
                      </div>
                    )}

                    {event.river_level_at_peak !== null && event.river_level_at_peak !== undefined && (
                      <div className="flex items-center space-x-1 bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 px-2 py-0.5 rounded">
                        <Waves className="w-3 h-3 text-cyan-400" />
                        <span className="text-[11px] font-medium">
                          Peak Stage: <strong className="font-bold">{event.river_level_at_peak} m</strong>
                        </span>
                      </div>
                    )}

                    {event.casualties !== null && event.casualties !== undefined && (
                      <div className="flex items-center space-x-1 bg-rose-950/30 border border-rose-800/40 text-rose-300 px-2 py-0.5 rounded">
                        <Users className="w-3 h-3 text-rose-400" />
                        <span className="text-[11px] font-medium">
                          Casualties: <strong className="font-bold">{event.casualties.toLocaleString()}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Narrative Description */}
                <p className="text-xs text-slate-300 leading-relaxed pl-1">
                  {event.description}
                </p>

                {/* Source Citation */}
                <div className="flex items-start space-x-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-400 uppercase tracking-wide text-[10px] mr-1">
                      Official Source Citation:
                    </span>
                    <span className="text-slate-300 italic">
                      {event.source_citation}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
