import math
from typing import List, Dict, Any, Optional
from app.models import Infrastructure, Location

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in km."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def compute_downscaled_infrastructure_risk(
    base_station_risk: float,
    location: Location,
    infra: Infrastructure,
    current_river_level: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes a localized, micro-topographic downscaled flood risk score (0 - 100)
    for an individual settlement or critical infrastructure asset:
    1. Base: Starts from parent station's ML / hybrid risk score (e.g. 74.5%)
    2. Proximity Offset: Adjusts based on distance from riverbed / monitoring station
    3. Vertical Elevation Buffer: High-ground relief vs. alluvial depression
    4. Local Slope Factor: Steep gradient landslide and debris slide runout
    5. Structural Exposure: Bridge vs. Hospital vs. Village vs. School vs. Road
    """
    dist_km = haversine_distance_km(location.lat, location.lng, infra.lat, infra.lng)

    # 1. Proximity Adjustment (closer to river channel = higher exposure)
    if dist_km <= 0.5:
        dist_factor = round(8.5 * (1.0 - (dist_km / 0.5)), 2)  # up to +8.5%
    elif dist_km <= 1.5:
        dist_factor = round(4.0 * (1.0 - (dist_km - 0.5) / 1.0), 2)  # +0.0% to +4.0%
    elif dist_km <= 3.5:
        dist_factor = round(-5.0 * ((dist_km - 1.5) / 2.0), 2)  # -0.0% to -5.0%
    else:
        dist_factor = round(max(-18.0, -5.0 - (2.0 * (dist_km - 3.5))), 2)  # up to -18.0%

    # 2. Elevation / Topographic Buffer Adjustment
    elev_factor = 0.0
    infra_elev = getattr(infra, "elevation", None)
    if infra_elev is not None and location.elevation is not None:
        delta_z = infra_elev - location.elevation
        if delta_z > 0:
            # Elevated village: -1.2% per 20m of vertical relief (capped at -22%)
            elev_factor = round(max(-22.0, -(delta_z / 20.0) * 1.2), 2)
        else:
            # Low-lying alluvial sink or gorge bottleneck: +1.5% per 15m lower (capped at +18%)
            elev_factor = round(min(18.0, (abs(delta_z) / 15.0) * 1.5), 2)
    else:
        elev_factor = round(max(-10.0, -1.5 * dist_km), 2)

    # 3. Local Slope & Debris Slide Amplification
    slope_factor = 0.0
    infra_slope = getattr(infra, "slope", None) or location.slope or 25.0
    if infra_slope >= 38.0:
        slope_factor = 7.0  # Acute colluvial debris slide hazard
    elif infra_slope >= 30.0:
        slope_factor = 4.0  # Moderate slope hazard
    elif infra_slope <= 12.0:
        # Flat valley floor prone to sustained standing inundation ponding
        slope_factor = 2.5
    else:
        slope_factor = 0.0

    # 4. Asset Type Structural Vulnerability
    TYPE_OFFSETS = {
        "bridge": 6.5,     # Immediate washout risk
        "hospital": 5.0,   # Dependent patients & emergency life-support
        "school": 4.0,     # Congregated children
        "village": 3.0,    # Dense residential community
        "road": 0.0        # Evacuation conduit
    }
    type_factor = TYPE_OFFSETS.get(infra.type.lower(), 2.0)

    # 5. River Surge Amplification (if river above danger level and asset within 2km)
    surge_factor = 0.0
    if current_river_level is not None and location.danger_river_level:
        excess = current_river_level - location.danger_river_level
        if excess > 0 and dist_km <= 2.0:
            surge_factor = round(min(12.0, excess * 4.0 * (1.0 - (dist_km / 2.0))), 2)

    # Composite downscaled score calculation
    raw_score = base_station_risk + dist_factor + elev_factor + slope_factor + type_factor + surge_factor
    downscaled_score = round(min(99.5, max(5.0, raw_score)), 1)
    downscaled_delta = round(downscaled_score - base_station_risk, 1)

    # Determine localized risk tier
    if downscaled_score >= 80.0:
        downscaled_level = "CRITICAL"
    elif downscaled_score >= 60.0:
        downscaled_level = "WARNING"
    elif downscaled_score >= 35.0:
        downscaled_level = "WATCH"
    else:
        downscaled_level = "NORMAL"

    return {
        "downscaled_risk_score": downscaled_score,
        "downscaled_risk_level": downscaled_level,
        "downscaled_delta": downscaled_delta,
        "downscaling_factors": {
            "distance_factor": dist_factor,
            "elevation_factor": elev_factor,
            "slope_factor": slope_factor,
            "structural_factor": type_factor,
            "surge_factor": surge_factor
        }
    }

def assess_infrastructure_impact(
    location: Location,
    infrastructure_list: List[Infrastructure],
    current_risk_level: str = "NORMAL",
    station_risk_score: Optional[float] = None,
    river_level: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    Evaluates vulnerability score, evacuation priority ranking, and localized
    downscaled risk scores for all infrastructure elements around a monitored location.
    """
    # Derive base station score if not explicitly passed
    if station_risk_score is None:
        BASE_SCORE_MAP = {"CRITICAL": 85.0, "WARNING": 68.0, "WATCH": 42.0, "NORMAL": 18.0}
        base_station_risk = BASE_SCORE_MAP.get(current_risk_level, 25.0)
    else:
        base_station_risk = float(station_risk_score)

    TYPE_WEIGHTS = {
        "hospital": 9.5,
        "school": 8.8,
        "village": 8.0,
        "bridge": 7.5,
        "road": 6.0
    }

    RISK_LEVEL_MULTIPLIER = {
        "NORMAL": 0.2,
        "WATCH": 0.5,
        "WARNING": 0.8,
        "CRITICAL": 1.0
    }

    assessed = []
    for infra in infrastructure_list:
        dist_km = haversine_distance_km(location.lat, location.lng, infra.lat, infra.lng)
        base_type_weight = TYPE_WEIGHTS.get(infra.type.lower(), 5.0)

        # Compute micro-topographic downscaled risk
        downscale = compute_downscaled_infrastructure_risk(
            base_station_risk=base_station_risk,
            location=location,
            infra=infra,
            current_river_level=river_level
        )

        downscaled_score = downscale["downscaled_risk_score"]
        downscaled_level = downscale["downscaled_risk_level"]

        # Population impact factor (log scale)
        pop = infra.population_estimate or 0
        pop_factor = min(3.0, math.log10(pop + 10) / 1.5) if pop > 0 else 0.5

        # Distance penalty
        proximity_factor = max(0.1, (10.0 - min(dist_km, 10.0)) / 10.0)

        risk_mult = RISK_LEVEL_MULTIPLIER.get(downscaled_level, 0.5)

        # Composite vulnerability score (0 - 100)
        vulnerability_score = round(
            ((base_type_weight * 0.4) + (pop_factor * 0.3) + (proximity_factor * 3.0)) * 10.0 * risk_mult,
            1
        )
        vulnerability_score = min(100.0, max(5.0, vulnerability_score))

        # Dynamic actionable recommendation tailored to the downscaled risk level
        if infra.type.lower() == "hospital":
            if downscaled_level == "CRITICAL":
                rec = "Emergency vertical evacuation of lower-level wards; deploy backup generators & airborne airlift."
            elif downscaled_level == "WARNING":
                rec = "Restrict elective admissions; prepare ICU patients and oxygen reserves for high-ground transit."
            elif downscaled_level == "WATCH":
                rec = "Standby status; check backup power generator fuel and flood pumping stations."
            else:
                rec = "Normal medical facility operational readiness; routine catchment monitoring."
        elif infra.type.lower() == "school":
            if downscaled_level in ["CRITICAL", "WARNING"]:
                rec = "Order immediate suspension of classes; assemble students at designated high-elevation shelter."
            elif downscaled_level == "WATCH":
                rec = "Issue parent advisories; prepare early dismissal protocol if river stage climbs."
            else:
                rec = "Monitor regional disaster alerts; verify quarterly evacuation drills."
        elif infra.type.lower() == "village":
            if downscaled_level == "CRITICAL":
                rec = f"RED SIREN TRIGGERED. Immediate mandatory evacuation of {pop:,} residents along Route-Alpha."
            elif downscaled_level == "WARNING":
                rec = f"Deploy SDRF teams; broadcast targeted early evacuation warning to {pop:,} villagers."
            elif downscaled_level == "WATCH":
                rec = f"Issue Yellow Advisory to {pop:,} villagers; alert Gram Pradhan & inspect ward nullahs."
            else:
                rec = "Regular community river gauge watch; keep village warning sirens tested."
        elif infra.type.lower() == "bridge":
            if downscaled_level == "CRITICAL":
                rec = "Immediate traffic closure & barricading; high risk of structural abutment scouring and washout."
            elif downscaled_level == "WARNING":
                rec = "Weight restrictions active; dispatch structural engineers to monitor clearance and debris jams."
            else:
                rec = "Monitor water clearance level and seasonal debris accumulation."
        elif infra.type.lower() == "road":
            if downscaled_level == "CRITICAL":
                rec = "Block highway corridor entry points due to active debris flow runout; reroute heavy traffic."
            elif downscaled_level == "WARNING":
                rec = "Deploy warning signboards; standby earthmovers and JCBs for rapid landslide clearance."
            else:
                rec = "Normal mountain highway patrol and culvert inspection."
        else:
            rec = "Standard monitoring protocols active."

        assessed.append({
            "id": infra.id,
            "location_id": infra.location_id,
            "name": infra.name,
            "type": infra.type,
            "lat": infra.lat,
            "lng": infra.lng,
            "population_estimate": infra.population_estimate,
            "distance_km": dist_km,
            "elevation": getattr(infra, "elevation", None),
            "slope": getattr(infra, "slope", None),
            "downscaled_risk_score": downscaled_score,
            "downscaled_risk_level": downscaled_level,
            "downscaled_delta": downscale["downscaled_delta"],
            "downscaling_factors": downscale["downscaling_factors"],
            "vulnerability_score": vulnerability_score,
            "recommended_action": rec
        })

    # Sort primarily by downscaled risk score descending, then vulnerability score descending
    assessed.sort(key=lambda x: (-x["downscaled_risk_score"], -x["vulnerability_score"], x["distance_km"]))

    # Assign 1-indexed evacuation priority rank based on downscaled danger
    for idx, item in enumerate(assessed, 1):
        item["evacuation_priority"] = idx

    return assessed
