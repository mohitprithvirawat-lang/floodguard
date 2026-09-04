import math
from typing import Dict, Any

# Reasonable default geotechnical soil parameters calibrated for Himalayan steep valley colluvium
DEFAULT_COHESION_KPA = 12.0          # Effective cohesion c' (kPa)
DEFAULT_FRICTION_ANGLE_DEG = 32.0   # Internal angle of friction phi' (degrees)
DEFAULT_SOIL_UNIT_WEIGHT = 19.0     # Soil total unit weight gamma (kN/m^3)
WATER_UNIT_WEIGHT = 9.81            # Water unit weight gamma_w (kN/m^3)
DEFAULT_FAILURE_DEPTH_M = 2.0       # Mantle failure plane depth z (m)

def calculate_slope_stability(
    slope_deg: float,
    soil_moisture_pct: float,
    cohesion_kpa: float = DEFAULT_COHESION_KPA,
    friction_angle_deg: float = DEFAULT_FRICTION_ANGLE_DEG,
    soil_unit_weight: float = DEFAULT_SOIL_UNIT_WEIGHT,
    failure_depth_m: float = DEFAULT_FAILURE_DEPTH_M
) -> Dict[str, Any]:
    """
    Calculates the Factor of Safety (FoS) using the Infinite-Slope geotechnical model:
    
    FoS = [ c + (gamma - gamma_w * m) * z * cos^2(beta) * tan(phi) ] / [ gamma * z * sin(beta) * cos(beta) ]
    
    Where:
      - beta: terrain slope angle in radians
      - c: effective cohesion (kPa)
      - gamma: total soil unit weight (kN/m^3)
      - gamma_w: unit weight of water (9.81 kN/m^3)
      - m: ground-water saturation ratio (0.0 to 1.0) driven by soil moisture
      - z: soil mantle failure slab depth (m)
      - phi: internal soil friction angle in radians
    """
    # Enforce minimum slope angle to prevent division by zero in flat terrain
    effective_slope_deg = max(float(slope_deg), 2.0)
    beta_rad = math.radians(effective_slope_deg)
    phi_rad = math.radians(max(float(friction_angle_deg), 5.0))

    # Saturation ratio m (0.0 to 1.0) directly derived from sensor soil moisture
    # 0% moisture -> m=0.0 (completely dry)
    # 100% moisture -> m=1.0 (fully saturated phreatic surface at ground level)
    m = max(0.0, min(1.0, float(soil_moisture_pct) / 100.0))

    c = float(cohesion_kpa)
    gamma = float(soil_unit_weight)
    gamma_w = WATER_UNIT_WEIGHT
    z = float(failure_depth_m)

    cos_beta = math.cos(beta_rad)
    sin_beta = math.sin(beta_rad)
    tan_phi = math.tan(phi_rad)

    # 1. Resisting shear stress (Shear Strength tau_f)
    # tau_f = c + (gamma - gamma_w * m) * z * cos^2(beta) * tan(phi)
    effective_normal_term = (gamma - (gamma_w * m)) * z * (cos_beta ** 2) * tan_phi
    resisting_stress_kpa = c + max(0.0, effective_normal_term)

    # 2. Driving shear stress (Gravitational Shear Stress tau_d)
    # tau_d = gamma * z * sin(beta) * cos(beta)
    driving_stress_kpa = gamma * z * sin_beta * cos_beta
    safe_driving_stress = max(driving_stress_kpa, 0.001)

    # 3. Factor of Safety
    fos = resisting_stress_kpa / safe_driving_stress
    fos = round(max(0.1, min(5.0, fos)), 3)

    # 4. Geotechnical Stability Classification
    if fos >= 1.5:
        stability_status = "STABLE"
        risk_tier = "NORMAL"
    elif fos >= 1.2:
        stability_status = "MODERATE"
        risk_tier = "WATCH"
    elif fos >= 1.0:
        stability_status = "UNSTABLE"
        risk_tier = "WARNING"
    else:
        stability_status = "FAILURE_IMMINENT"
        risk_tier = "CRITICAL"

    # 5. Geotechnical Risk Score (0.0 - 100.0%)
    # FoS >= 2.0 -> 0% risk
    # FoS == 1.5 -> 38.5%
    # FoS == 1.2 -> 61.5%
    # FoS == 1.0 -> 76.9%
    # FoS <= 0.7 -> 100% risk
    if fos >= 2.0:
        geotech_risk_score = 0.0
    elif fos <= 0.7:
        geotech_risk_score = 100.0
    else:
        geotech_risk_score = ((2.0 - fos) / (2.0 - 0.7)) * 100.0
    geotech_risk_score = round(max(0.0, min(100.0, geotech_risk_score)), 1)

    return {
        "factor_of_safety": fos,
        "stability_status": stability_status,
        "geotechnical_risk_score": geotech_risk_score,
        "geotechnical_risk_level": risk_tier,
        "parameters": {
            "slope_deg": round(effective_slope_deg, 1),
            "soil_moisture_pct": round(float(soil_moisture_pct), 1),
            "saturation_ratio_m": round(m, 3),
            "cohesion_kpa": c,
            "friction_angle_deg": round(float(friction_angle_deg), 1),
            "soil_unit_weight_kn_m3": gamma,
            "water_unit_weight_kn_m3": gamma_w,
            "failure_depth_z_m": z
        },
        "stress_mechanics": {
            "resisting_stress_kpa": round(resisting_stress_kpa, 2),
            "driving_stress_kpa": round(driving_stress_kpa, 2),
            "cohesion_contribution_kpa": round(c, 2),
            "frictional_contribution_kpa": round(max(0.0, effective_normal_term), 2)
        }
    }


def combine_hydrological_and_geotechnical(
    hydrological_score: float,
    hydrological_level: str,
    geotech_result: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Transparently fuses data-driven ML Hydrological Risk with physics-based Geotechnical Risk:
    - 65% Hydrological Surge (Random Forest ML)
    - 35% Geotechnical Slope Instability (Infinite-Slope FoS)
    - Physics Override: If slope Factor of Safety < 1.0 (active failure), escalates to CRITICAL,
      simulating catastrophic landslide damming / debris-flow blockages common in the Himalayas.
    """
    h_score = float(hydrological_score)
    g_score = float(geotech_result.get("geotechnical_risk_score", 0.0))
    fos = float(geotech_result.get("factor_of_safety", 1.5))
    g_status = geotech_result.get("stability_status", "STABLE")

    # Weighted baseline
    weighted_score = (0.65 * h_score) + (0.35 * g_score)

    # Physical safety override logic:
    # In steep Himalayan gorges, active slope failures dump millions of tons of debris into rivers,
    # damming flows and causing catastrophic flash floods upon breach (e.g. 2021 Chamoli disaster).
    override_applied = False
    override_reason = ""

    if fos < 1.0:
        override_applied = True
        override_reason = f"CRITICAL PHYSICS OVERRIDE: Slope Factor of Safety ({fos}) < 1.0 indicates active slope collapse and potential debris damming."
        final_score = max(82.0, weighted_score)
    elif fos < 1.2:
        override_applied = True
        override_reason = f"WARNING PHYSICS OVERRIDE: Slope Factor of Safety ({fos}) < 1.2 indicates quasi-stable shear threshold."
        final_score = max(60.0, weighted_score)
    else:
        final_score = weighted_score

    final_score = round(max(0.0, min(100.0, final_score)), 1)

    if final_score < 35.0:
        final_level = "NORMAL"
    elif final_score < 60.0:
        final_level = "WATCH"
    elif final_score < 80.0:
        final_level = "WARNING"
    else:
        final_level = "CRITICAL"

    fusion_rationale = (
        f"Hybrid risk combines 65% Hydrological ML Risk ({h_score}%) with 35% Geotechnical Physics FoS Risk ({g_score}%). "
        + (override_reason if override_applied else f"Slope condition is {g_status} (FoS {fos}).")
    )

    return {
        "combined_risk_score": final_score,
        "combined_risk_level": final_level,
        "hydrological_risk": {
            "score": h_score,
            "level": hydrological_level,
            "weight": 0.65,
            "source": "Random Forest Hydrology Regressor"
        },
        "geotechnical_risk": {
            "factor_of_safety": fos,
            "stability_status": g_status,
            "geotechnical_risk_score": g_score,
            "geotechnical_risk_level": geotech_result.get("geotechnical_risk_level", "NORMAL"),
            "weight": 0.35,
            "source": "Infinite-Slope Factor of Safety (FoS) Physics Engine",
            "parameters": geotech_result.get("parameters", {}),
            "stress_mechanics": geotech_result.get("stress_mechanics", {})
        },
        "physics_override_applied": override_applied,
        "fusion_rationale": fusion_rationale,
        "hybrid_risk": {
            "combined_risk_score": final_score,
            "combined_risk_level": final_level,
            "physics_override_applied": override_applied,
            "fusion_rationale": fusion_rationale
        }
    }
