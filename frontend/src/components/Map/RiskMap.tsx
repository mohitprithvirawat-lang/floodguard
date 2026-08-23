'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';
import { RiskStationMapItem, RiskLevel } from '@/lib/types';
import { getRiskColor, getRiskBadgeClasses } from '@/lib/utils';
import { ArrowRight, AlertTriangle, Waves, CloudRain, Clock, Mountain } from 'lucide-react';

interface RiskMapProps {
  stations: RiskStationMapItem[];
  selectedLocationId?: number;
}

// Function to create animated SVG Leaflet marker
function createPulseIcon(level: RiskLevel | string, score: number) {
  const color = getRiskColor(level);
  const isHighRisk = level === 'CRITICAL' || level === 'WARNING';
  const pulseClass = level === 'CRITICAL' ? 'risk-pulse-critical' : level === 'WARNING' ? 'risk-pulse-warning' : '';

  const html = `
    <div class="relative flex items-center justify-center w-10 h-10 -ml-2 -mt-2 cursor-pointer">
      ${isHighRisk ? `<div class="absolute w-10 h-10 rounded-full ${pulseClass}" style="background-color: ${color};"></div>` : ''}
      <div class="relative w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[11px] shadow-lg border-2 border-white/80 transition-transform transform hover:scale-125" style="background-color: ${color};">
        ${Math.round(score)}
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-risk-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function MapUpdater({ stations, selectedLocationId }: { stations: RiskStationMapItem[]; selectedLocationId?: number }) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocationId) {
      const target = stations.find((s) => s.id === selectedLocationId);
      if (target) {
        map.flyTo([target.lat, target.lng], 10, { duration: 1.2 });
      }
    }
  }, [selectedLocationId, stations, map]);

  return null;
}

export default function RiskMap({ stations, selectedLocationId }: RiskMapProps) {
  const centerLat = 31.15;
  const centerLng = 77.95;

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-xl overflow-hidden border border-[#1f293d] shadow-xl bg-[#0b0f19]">
      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 z-[1000] bg-[#0f172a]/90 backdrop-blur border border-[#1f293d] p-3 rounded-lg shadow-xl text-xs space-y-1.5 pointer-events-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
          <span>Early Warning Threat Level</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-[#ef4444] animate-pulse"></span>
          <span className="text-slate-200 font-semibold">Critical (&ge;80%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-[#f97316]"></span>
          <span className="text-slate-200 font-semibold">Warning (60-79%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-[#eab308]"></span>
          <span className="text-slate-200 font-semibold">Watch (35-59%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-[#22c55e]"></span>
          <span className="text-slate-200 font-semibold">Normal (&lt;35%)</span>
        </div>
      </div>

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={7}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapUpdater stations={stations} selectedLocationId={selectedLocationId} />

        {stations.map((station) => {
          const icon = createPulseIcon(station.risk_level, station.risk_score);
          const isHighRisk = station.risk_level === 'CRITICAL' || station.risk_level === 'WARNING';
          const dangerDist = station.risk_level === 'CRITICAL' ? 8000 : station.risk_level === 'WARNING' ? 5000 : 2500;

          return (
            <React.Fragment key={station.id}>
              {/* Influence Danger Buffer for high-risk zones */}
              {isHighRisk && (
                <Circle
                  center={[station.lat, station.lng]}
                  radius={dangerDist}
                  pathOptions={{
                    color: station.color,
                    fillColor: station.color,
                    fillOpacity: station.risk_level === 'CRITICAL' ? 0.18 : 0.1,
                    weight: 1.5,
                    dashArray: '4, 4'
                  }}
                />
              )}

              <Marker position={[station.lat, station.lng]} icon={icon}>
                <Popup>
                  <div className="p-3 w-72 bg-[#0f172a] text-white rounded-lg">
                    {/* Station Name and Risk Badge */}
                    <div className="flex items-start justify-between border-b border-slate-700 pb-2 mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-white leading-tight">{station.name}</h4>
                        <p className="text-[11px] text-slate-400">{station.district}, {station.state}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getRiskBadgeClasses(station.risk_level)}`}>
                        {station.risk_level}
                      </span>
                    </div>

                    {/* Sensor Telemetry Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-slate-900/80 p-2 rounded border border-slate-800">
                      <div>
                        <span className="text-slate-400 text-[10px] block">AI Risk Index</span>
                        <span className="font-black text-sm" style={{ color: station.color }}>
                          {station.risk_score}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Warning Window</span>
                        <span className="font-bold text-slate-200">{station.warning_window_minutes} mins</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">River Stage</span>
                        <span className="font-semibold text-slate-200">
                          {station.river_level}m / {station.danger_river_level}m
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Rainfall (3-Hr)</span>
                        <span className="font-semibold text-slate-200">{station.rainfall_3h} mm</span>
                      </div>
                    </div>

                    {/* Proactive Directive */}
                    <div className="text-[11px] text-slate-300 mb-3 bg-blue-950/40 border border-blue-800/40 p-1.5 rounded">
                      <span className="text-blue-400 font-semibold">Primary Driver: </span>
                      {station.top_risk_driver.replace(/_/g, ' ')}
                    </div>

                    {/* Detail Link */}
                    <Link
                      href={`/location/${station.id}`}
                      className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors"
                    >
                      <span>Analyze & Evacuation Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
