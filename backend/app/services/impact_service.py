import math
from typing import List, Dict, Any
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

def assess_infrastructure_impact(
    location: Location,
    infrastructure_list: List[Infrastructure],
    current_risk_level: str = "NORMAL"
) -> List[Dict[str, Any]]:
    """
    Evaluates vulnerability score and evacuation priority ranking
    for all infrastructure elements around a monitored location.
    """
    # Base vulnerability weight by type
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

        # Population impact factor (log scale)
        pop = infra.population_estimate or 0
        pop_factor = min(3.0, math.log10(pop + 10) / 1.5) if pop > 0 else 0.5

        # Distance penalty: closer = much higher vulnerability (within 5 km is critical)
        proximity_factor = max(0.1, (10.0 - min(dist_km, 10.0)) / 10.0)

        risk_mult = RISK_LEVEL_MULTIPLIER.get(current_risk_level, 0.5)

        # Composite vulnerability score (0 - 100)
        vulnerability_score = round(
            ((base_type_weight * 0.4) + (pop_factor * 0.3) + (proximity_factor * 3.0)) * 10.0 * risk_mult,
            1
        )
        vulnerability_score = min(100.0, max(5.0, vulnerability_score))

        # Dynamic actionable recommendation
        if infra.type.lower() == "hospital":
            if current_risk_level == "CRITICAL":
                rec = "Emergency vertical evacuation of lower-level patients; stage rescue choppers & backup generators."
            elif current_risk_level == "WARNING":
                rec = "Restrict non-emergency admissions; prep medical supplies for high-ground transit."
            else:
                rec = "Standby status; check auxiliary power & water pump systems."
        elif infra.type.lower() == "school":
            if current_risk_level in ["CRITICAL", "WARNING"]:
                rec = "Order immediate suspension of classes; assemble students at designated high-elevation shelter."
            else:
                rec = "Monitor regional disaster warnings; verify evacuation drills."
        elif infra.type.lower() == "village":
            if current_risk_level == "CRITICAL":
                rec = f"Issue RED SIREN. Immediate mandatory evacuation of {pop:,} residents along Route-Alpha."
            elif current_risk_level == "WARNING":
                rec = f"Deploy SDRF teams; broadcast early evacuation notice to {pop:,} villagers."
            else:
                rec = "Regular community river gauge watch; keep village sirens tested."
        elif infra.type.lower() == "bridge":
            if current_risk_level in ["CRITICAL", "WARNING"]:
                rec = "Immediate barricading and traffic closure; dispatch structural sensor inspection team."
            else:
                rec = "Monitor water clearance level and debris accumulation."
        elif infra.type.lower() == "road":
            if current_risk_level == "CRITICAL":
                rec = "Block highway entry points due to active flash debris flow risk; reroute heavy traffic."
            elif current_risk_level == "WARNING":
                rec = "Place warning signboards; standby earthmovers for rapid landslide clearance."
            else:
                rec = "Normal mountain highway patrol."
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
            "vulnerability_score": vulnerability_score,
            "recommended_action": rec
        })

    # Sort primarily by vulnerability score descending, then distance ascending
    assessed.sort(key=lambda x: (-x["vulnerability_score"], x["distance_km"]))

    # Assign 1-indexed evacuation priority rank
    for idx, item in enumerate(assessed, 1):
        item["evacuation_priority"] = idx

    return assessed
