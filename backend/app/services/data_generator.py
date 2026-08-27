import random
from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.models import Location, SensorReading

def generate_reading_for_location(
    location: Location,
    timestamp: datetime = None,
    step_offset: int = 0
) -> Dict[str, Any]:
    """
    Simulates a realistic multivariate hydrological sensor reading for a given location,
    respecting its current scenario state
    ('NORMAL', 'BUILDING_STORM', 'FLASH_FLOOD_IMMINENT', 'CLOUDBURST').
    """
    if timestamp is None:
        timestamp = datetime.utcnow()

    scenario = location.scenario or "NORMAL"
    danger_mark = location.danger_river_level or 8.0
    step = (location.scenario_step or 0) + step_offset

    # Add realistic micro-variations
    jitter = random.uniform(-0.08, 0.08)

    if scenario == "CLOUDBURST":
        # Sudden orographic micro-burst — single-tick spike to IMD cloudburst threshold (>=100 mm/h).
        # All correlated variables set immediately so the RF model reacts in one step.
        r1h = round(random.uniform(100.0, 130.0) + (jitter * 5.0), 1)       # Instant spike
        r3h = round(r1h * 1.65 + random.uniform(25.0, 50.0), 1)              # Rolling 3-hr accumulation
        r6h = round(r3h * 1.3 + random.uniform(35.0, 65.0), 1)
        r24h = round(r6h * 1.2 + random.uniform(55.0, 110.0), 1)
        temp = round(12.5 + random.uniform(-1.5, 1.5), 1)                    # Sharp temperature drop
        humidity = round(min(100.0, 97.5 + random.uniform(0.0, 2.5)), 1)     # Near-saturated atmosphere
        soil_moisture = round(min(99.9, 96.0 + random.uniform(0.0, 3.9)), 1) # Completely saturated catchment
        change_rate = round(3.0 + random.uniform(0.0, 0.9), 2)               # Extreme surge rate >3 m/h
        river_level = round(danger_mark + 2.0 + random.uniform(0.5, 2.5), 2) # Well above danger mark
        forecast_3h = round(random.uniform(95.0, 135.0), 1)                  # Continued extreme forecast

    elif scenario == "FLASH_FLOOD_IMMINENT":
        # Sustained extreme runoff — ramps up progressively over multiple ticks
        step_factor = min(1.0, 0.6 + (step * 0.1))
        r1h = round(75.0 + (step_factor * 45.0) + (jitter * 20.0), 1)
        r3h = round(r1h * 1.8 + random.uniform(10.0, 30.0), 1)
        r6h = round(r3h * 1.5 + random.uniform(20.0, 40.0), 1)
        r24h = round(r6h * 1.4 + random.uniform(40.0, 80.0), 1)
        temp = round(16.0 - (step_factor * 2.5) + random.uniform(-0.5, 0.5), 1)
        humidity = round(min(100.0, 93.0 + random.uniform(1.0, 6.0)), 1)
        soil_moisture = round(min(99.5, 91.0 + (step_factor * 7.5) + random.uniform(-0.5, 1.0)), 1)
        change_rate = round(1.8 + (step_factor * 1.4) + random.uniform(-0.2, 0.3), 2)
        river_level = round(danger_mark + 0.8 + (step_factor * 2.5) + random.uniform(-0.2, 0.3), 2)
        forecast_3h = round(85.0 + (step_factor * 40.0) + random.uniform(-5.0, 10.0), 1)

    elif scenario == "BUILDING_STORM":
        # Continuous heavy precipitation ramping up
        step_factor = min(1.0, 0.3 + (step * 0.12))
        r1h = round(28.0 + (step_factor * 30.0) + (jitter * 10.0), 1)
        r3h = round(r1h * 1.9 + random.uniform(10.0, 25.0), 1)
        r6h = round(r3h * 1.4 + random.uniform(15.0, 30.0), 1)
        r24h = round(r6h * 1.3 + random.uniform(25.0, 50.0), 1)
        temp = round(19.0 - (step_factor * 2.0) + random.uniform(-0.5, 0.5), 1)
        humidity = round(min(98.0, 82.0 + (step_factor * 12.0) + random.uniform(-1.0, 2.0)), 1)
        soil_moisture = round(min(89.0, 68.0 + (step_factor * 18.0) + random.uniform(-1.0, 1.0)), 1)
        change_rate = round(0.55 + (step_factor * 0.75) + random.uniform(-0.1, 0.15), 2)
        river_level = round((danger_mark * 0.72) + (step_factor * (danger_mark * 0.24)) + random.uniform(-0.15, 0.15), 2)
        forecast_3h = round(45.0 + (step_factor * 30.0) + random.uniform(-5.0, 8.0), 1)

    else:  # NORMAL
        r1h = round(max(0.0, random.uniform(0.2, 4.5) + (jitter * 1.0)), 1)
        r3h = round(r1h + random.uniform(1.0, 5.5), 1)
        r6h = round(r3h + random.uniform(2.0, 9.0), 1)
        r24h = round(r6h + random.uniform(5.0, 18.0), 1)
        temp = round(22.0 + random.uniform(-2.0, 3.5), 1)
        humidity = round(random.uniform(48.0, 68.0), 1)
        soil_moisture = round(random.uniform(28.0, 46.0), 1)
        change_rate = round(random.uniform(-0.06, 0.08), 2)
        river_level = round((danger_mark * 0.35) + random.uniform(-0.25, 0.25), 2)
        forecast_3h = round(random.uniform(1.0, 8.0), 1)

    return {
        "location_id": location.id,
        "timestamp": timestamp,
        "rainfall_1h": r1h,
        "rainfall_3h": r3h,
        "rainfall_6h": r6h,
        "rainfall_24h": r24h,
        "temperature": temp,
        "humidity": humidity,
        "river_level": river_level,
        "river_level_change_rate": change_rate,
        "soil_moisture": soil_moisture,
        "distance_from_river": 50.0,
        "forecast_rainfall_next_3h": forecast_3h
    }

def generate_historical_readings(location: Location, hours: int = 24, count: int = 24) -> List[Dict[str, Any]]:
    """Generates a realistic time-series sequence for charting historical trends."""
    now = datetime.utcnow()
    readings = []
    interval_minutes = int((hours * 60) / max(count, 1))

    for i in range(count, 0, -1):
        t = now - timedelta(minutes=i * interval_minutes)
        # Historical step offset simulates the ramp-up
        offset = max(0, location.scenario_step - i)
        reading = generate_reading_for_location(location, timestamp=t, step_offset=offset)
        readings.append(reading)

    return readings
