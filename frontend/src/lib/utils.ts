import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { RiskLevel } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRiskColor(level: RiskLevel | string): string {
  switch (level?.toUpperCase()) {
    case "CRITICAL":
      return "#ef4444"; // Red
    case "WARNING":
      return "#f97316"; // Orange
    case "WATCH":
      return "#eab308"; // Yellow
    case "NORMAL":
    default:
      return "#22c55e"; // Green
  }
}

export function getRiskBadgeClasses(level: RiskLevel | string): string {
  switch (level?.toUpperCase()) {
    case "CRITICAL":
      return "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse";
    case "WARNING":
      return "bg-amber-500/20 text-amber-400 border border-amber-500/40";
    case "WATCH":
      return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40";
    case "NORMAL":
    default:
      return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
  }
}

export function getRiskBorderClasses(level: RiskLevel | string): string {
  switch (level?.toUpperCase()) {
    case "CRITICAL":
      return "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]";
    case "WARNING":
      return "border-amber-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]";
    case "WATCH":
      return "border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]";
    case "NORMAL":
    default:
      return "border-emerald-500/30";
  }
}

export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export const FEATURE_NAMES_HUMAN: Record<string, string> = {
  rainfall_1h: "Rainfall Rate (1-Hr)",
  rainfall_3h: "Cumulative Rain (3-Hr)",
  rainfall_6h: "Precipitation (6-Hr)",
  rainfall_24h: "Antecedent Rain (24-Hr)",
  river_level_change_rate: "River Surge Rate",
  river_level: "Current River Stage",
  soil_moisture: "Soil Saturation",
  forecast_rainfall_next_3h: "Forecast Rain (Next 3h)",
  slope: "Basin Slope Gradient",
  elevation: "Watershed Elevation",
  distance_from_river: "River Proximity",
  humidity: "Atmospheric Humidity",
  temperature: "Ambient Temperature"
};
