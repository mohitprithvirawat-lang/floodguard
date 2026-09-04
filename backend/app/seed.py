import json
import logging
from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import Location, SensorReading, RiskPrediction, Infrastructure, Alert, HistoricalEvent, SensorDevice
from app.ml.model import flood_model
from app.services.data_generator import generate_reading_for_location

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("floodguard.seed")

HIMALAYAN_LOCATIONS = [
    {
        "name": "Chamoli / Rishi Ganga Basin",
        "lat": 30.5524,
        "lng": 79.5684,
        "district": "Chamoli",
        "state": "Uttarakhand",
        "slope": 38.5,
        "elevation": 1900.0,
        "river_name": "Rishi Ganga / Alaknanda",
        "danger_river_level": 7.5,
        "scenario": "BUILDING_STORM",
        "infrastructure": [
            {"name": "Reni Village (Upper Ward)", "type": "village", "lat": 30.5560, "lng": 79.5720, "population_estimate": 850},
            {"name": "Tapovan Suspension Bridge", "type": "bridge", "lat": 30.5510, "lng": 79.5650, "population_estimate": None},
            {"name": "Govt Primary Health Centre Tapovan", "type": "hospital", "lat": 30.5540, "lng": 79.5695, "population_estimate": 120},
            {"name": "Joshimath-Malari Border Road (NH-58 Ext)", "type": "road", "lat": 30.5505, "lng": 79.5630, "population_estimate": None},
            {"name": "Reni High Secondary School", "type": "school", "lat": 30.5575, "lng": 79.5740, "population_estimate": 320},
        ]
    },
    {
        "name": "Kedarnath / Gaurikund Gorge",
        "lat": 30.7346,
        "lng": 79.0669,
        "district": "Rudraprayag",
        "state": "Uttarakhand",
        "slope": 44.0,
        "elevation": 3584.0,
        "river_name": "Mandakini River",
        "danger_river_level": 6.0,
        "scenario": "FLASH_FLOOD_IMMINENT",
        "infrastructure": [
            {"name": "Gaurikund Pilgrim Base Camp", "type": "village", "lat": 30.6520, "lng": 79.0270, "population_estimate": 3400},
            {"name": "Rambara Footbridge & Trail", "type": "bridge", "lat": 30.6900, "lng": 79.0450, "population_estimate": None},
            {"name": "Sonprayag Emergency Field Hospital", "type": "hospital", "lat": 30.6300, "lng": 78.9980, "population_estimate": 250},
            {"name": "Kedarnath Valley Highway (NH-107)", "type": "road", "lat": 30.6400, "lng": 79.0100, "population_estimate": None},
            {"name": "Guptkashi Central School", "type": "school", "lat": 30.5220, "lng": 79.0770, "population_estimate": 450},
        ]
    },
    {
        "name": "Joshimath / Vishnuprayag",
        "lat": 30.5564,
        "lng": 79.5637,
        "district": "Chamoli",
        "state": "Uttarakhand",
        "slope": 41.2,
        "elevation": 1890.0,
        "river_name": "Alaknanda / Dhauliganga",
        "danger_river_level": 8.0,
        "scenario": "BUILDING_STORM",
        "infrastructure": [
            {"name": "Marwari Ward Settlement", "type": "village", "lat": 30.5600, "lng": 79.5600, "population_estimate": 1200},
            {"name": "Vishnuprayag Hydro Plant Access Bridge", "type": "bridge", "lat": 30.5650, "lng": 79.5700, "population_estimate": None},
            {"name": "Joshimath Sub-District Hospital", "type": "hospital", "lat": 30.5550, "lng": 79.5620, "population_estimate": 300},
            {"name": "Badrinath National Highway (NH-07)", "type": "road", "lat": 30.5580, "lng": 79.5640, "population_estimate": None},
            {"name": "Kendriya Vidyalaya Joshimath", "type": "school", "lat": 30.5530, "lng": 79.5670, "population_estimate": 520},
        ]
    },
    {
        "name": "Kullu / Bhuntar Valley",
        "lat": 31.9579,
        "lng": 77.1095,
        "district": "Kullu",
        "state": "Himachal Pradesh",
        "slope": 34.0,
        "elevation": 1278.0,
        "river_name": "Beas / Parvati River",
        "danger_river_level": 8.5,
        "scenario": "WATCH",
        "infrastructure": [
            {"name": "Bhuntar Riverside Basti", "type": "village", "lat": 31.8780, "lng": 77.1500, "population_estimate": 2800},
            {"name": "Hathithan Bailey Bridge", "type": "bridge", "lat": 31.8820, "lng": 77.1540, "population_estimate": None},
            {"name": "Kullu Regional Hospital", "type": "hospital", "lat": 31.9560, "lng": 77.1080, "population_estimate": 650},
            {"name": "Chandigarh-Manali Highway (NH-21)", "type": "road", "lat": 31.9200, "lng": 77.1300, "population_estimate": None},
            {"name": "Govt Senior Sec School Bhuntar", "type": "school", "lat": 31.8790, "lng": 77.1520, "population_estimate": 780},
        ]
    },
    {
        "name": "Manali / Solang Watershed",
        "lat": 32.2432,
        "lng": 77.1892,
        "district": "Kullu",
        "state": "Himachal Pradesh",
        "slope": 39.5,
        "elevation": 2050.0,
        "river_name": "Upper Beas River",
        "danger_river_level": 6.5,
        "scenario": "NORMAL",
        "infrastructure": [
            {"name": "Old Manali Riverside Basti", "type": "village", "lat": 32.2510, "lng": 77.1820, "population_estimate": 1400},
            {"name": "Solang Valley Timber Bridge", "type": "bridge", "lat": 32.3150, "lng": 77.1570, "population_estimate": None},
            {"name": "Manali Civil Hospital", "type": "hospital", "lat": 32.2400, "lng": 77.1850, "population_estimate": 180},
            {"name": "Leh-Manali Highway (Atal Tunnel Link)", "type": "road", "lat": 32.2600, "lng": 77.1900, "population_estimate": None},
            {"name": "Dayanand Public School Manali", "type": "school", "lat": 32.2450, "lng": 77.1870, "population_estimate": 410},
        ]
    },
    {
        "name": "Dharamshala / Bhagsunag Falls",
        "lat": 32.2470,
        "lng": 76.3534,
        "district": "Kangra",
        "state": "Himachal Pradesh",
        "slope": 36.8,
        "elevation": 1457.0,
        "river_name": "Manjhi Khad & Bhagsunag Stream",
        "danger_river_level": 5.5,
        "scenario": "NORMAL",
        "infrastructure": [
            {"name": "Bhagsu Upper Hamlet", "type": "village", "lat": 32.2490, "lng": 76.3560, "population_estimate": 950},
            {"name": "McLeod Ganj Nullah Bridge", "type": "bridge", "lat": 32.2420, "lng": 76.3260, "population_estimate": None},
            {"name": "Zonal Hospital Dharamshala", "type": "hospital", "lat": 32.2180, "lng": 76.3200, "population_estimate": 450},
            {"name": "Dharamshala-McLeod Ganj Road", "type": "road", "lat": 32.2300, "lng": 76.3350, "population_estimate": None},
            {"name": "Govt High School Bhagsu", "type": "school", "lat": 32.2460, "lng": 76.3510, "population_estimate": 320},
        ]
    },
    {
        "name": "Uttarkashi / Bhagirathi Valley",
        "lat": 30.7268,
        "lng": 78.4354,
        "district": "Uttarkashi",
        "state": "Uttarakhand",
        "slope": 32.4,
        "elevation": 1158.0,
        "river_name": "Bhagirathi River",
        "danger_river_level": 9.0,
        "scenario": "NORMAL",
        "infrastructure": [
            {"name": "Tiloth Village Settlement", "type": "village", "lat": 30.7290, "lng": 78.4410, "population_estimate": 1650},
            {"name": "Joshiyara Suspension Bridge", "type": "bridge", "lat": 30.7240, "lng": 78.4320, "population_estimate": None},
            {"name": "Uttarkashi District Hospital", "type": "hospital", "lat": 30.7310, "lng": 78.4390, "population_estimate": 380},
            {"name": "Gangotri Highway (NH-34)", "type": "road", "lat": 30.7250, "lng": 78.4300, "population_estimate": None},
            {"name": "Govt Inter College Uttarkashi", "type": "school", "lat": 30.7280, "lng": 78.4360, "population_estimate": 620},
        ]
    },
    {
        "name": "Mandi / Pandoh Gorge",
        "lat": 31.7087,
        "lng": 76.9320,
        "district": "Mandi",
        "state": "Himachal Pradesh",
        "slope": 29.0,
        "elevation": 760.0,
        "river_name": "Beas River Gorge",
        "danger_river_level": 10.0,
        "scenario": "NORMAL",
        "infrastructure": [
            {"name": "Pandoh Dam Colony Settlement", "type": "village", "lat": 31.6700, "lng": 77.0100, "population_estimate": 1100},
            {"name": "Victoria Suspension Bridge", "type": "bridge", "lat": 31.7100, "lng": 76.9300, "population_estimate": None},
            {"name": "Shri Lal Bahadur Shastri Medical College", "type": "hospital", "lat": 31.6800, "lng": 76.9500, "population_estimate": 800},
            {"name": "Kiratpur-Manali Expressway", "type": "road", "lat": 31.7000, "lng": 76.9250, "population_estimate": None},
            {"name": "Govt Boys Senior Secondary Mandi", "type": "school", "lat": 31.7070, "lng": 76.9340, "population_estimate": 590},
        ]
    },
    {
        "name": "Rishikesh / Tapovan Ghats",
        "lat": 30.1319,
        "lng": 78.3248,
        "district": "Dehradun",
        "state": "Uttarakhand",
        "slope": 18.0,
        "elevation": 372.0,
        "river_name": "Ganga River",
        "danger_river_level": 14.0,
        "scenario": "NORMAL",
        "infrastructure": [
            {"name": "Muni Ki Reti Riverside Basti", "type": "village", "lat": 30.1280, "lng": 78.3180, "population_estimate": 4200},
            {"name": "Lakshman Jhula Bridge", "type": "bridge", "lat": 30.1330, "lng": 78.3280, "population_estimate": None},
            {"name": "AIIMS Rishikesh Tertiary Hospital", "type": "hospital", "lat": 30.0760, "lng": 78.2880, "population_estimate": 1500},
            {"name": "Badrinath Bypass Road", "type": "road", "lat": 30.1300, "lng": 78.3220, "population_estimate": None},
            {"name": "Punjab Sindh Kshetra School", "type": "school", "lat": 30.1290, "lng": 78.3200, "population_estimate": 480},
        ]
    },
    {
        "name": "Shimla / Sunni Sutlej Basin",
        "lat": 31.2427,
        "lng": 77.1194,
        "district": "Shimla",
        "state": "Himachal Pradesh",
        "slope": 31.5,
        "elevation": 655.0,
        "river_name": "Sutlej River",
        "danger_river_level": 8.0,
        "scenario": "NORMAL",
        "infrastructure": [
            {"name": "Sunni Riverside Hamlet", "type": "village", "lat": 31.2400, "lng": 77.1180, "population_estimate": 920},
            {"name": "Tattapani Hot Springs Bridge", "type": "bridge", "lat": 31.2500, "lng": 77.0860, "population_estimate": None},
            {"name": "Community Health Centre Sunni", "type": "hospital", "lat": 31.2430, "lng": 77.1210, "population_estimate": 90},
            {"name": "Shimla-Mandi State Highway 13", "type": "road", "lat": 31.2410, "lng": 77.1150, "population_estimate": None},
            {"name": "Sunni Govt Senior Sec School", "type": "school", "lat": 31.2440, "lng": 77.1230, "population_estimate": 350},
        ]
    }
]

HISTORICAL_DISASTER_EVENTS = [
    {
        "location_name": "Kedarnath / Gaurikund Gorge",
        "event_date": "2013-06-16",
        "event_type": "flash_flood",
        "trigger_rainfall_mm": 375.0,
        "river_level_at_peak": 9.8,
        "casualties": 5700,
        "description": "Catastrophic breach of the moraine-dammed Chorabari Glacial Lake caused by torrential multi-day monsoon cloudbursts, surging down Mandakini River and completely demolishing Rambara settlement and Gaurikund base camp.",
        "source_citation": "National Institute of Disaster Management (NIDM) Uttarakhand Disaster Report 2013 & IMD Special Bulletin"
    },
    {
        "location_name": "Chamoli / Rishi Ganga Basin",
        "event_date": "2021-02-07",
        "event_type": "flash_flood",
        "trigger_rainfall_mm": 15.0,
        "river_level_at_peak": 8.9,
        "casualties": 204,
        "description": "Massive rock and hanging glacier detachment from Ronti Peak plunged into Raunthi Gad, unleashing a hyper-concentrated debris deluge down Rishi Ganga and Dhauliganga valleys, destroying the Rishi Ganga and Tapovan Vishnugad hydro projects.",
        "source_citation": "Wadia Institute of Himalayan Geology (WIHG) & ISRO Disaster Management Support Services (DMSS) Report 2021"
    },
    {
        "location_name": "Joshimath / Vishnuprayag",
        "event_date": "2013-06-17",
        "event_type": "flash_flood",
        "trigger_rainfall_mm": 220.0,
        "river_level_at_peak": 9.5,
        "casualties": 45,
        "description": "Heavy monsoon torrents inundated the Alaknanda and Dhauliganga confluence at Vishnuprayag, burying the barrage silt chambers, eroding foundational river terraces, and submerging riverside wards in Marwari.",
        "source_citation": "Central Water Commission (CWC) Himalayan Basin Hydrological Survey 2013"
    },
    {
        "location_name": "Kullu / Bhuntar Valley",
        "event_date": "2023-07-09",
        "event_type": "flash_flood",
        "trigger_rainfall_mm": 246.0,
        "river_level_at_peak": 10.4,
        "casualties": 41,
        "description": "Unprecedented 48-hour continuous monsoon cloudbursts in Beas and Parvati catchments triggered peak discharge exceeding 2,290 m³/s, severing NH-21 highway segments and washing away downstream riverside settlements and the Hathithan approach.",
        "source_citation": "Himachal Pradesh State Disaster Management Authority (HPSDMA) Monsoon Flood Assessment 2023"
    },
    {
        "location_name": "Manali / Solang Watershed",
        "event_date": "2023-07-10",
        "event_type": "cloudburst",
        "trigger_rainfall_mm": 215.0,
        "river_level_at_peak": 8.2,
        "casualties": 12,
        "description": "Localized cloudburst over upper Beas headwaters caused sudden boulder and silt torrents down Solang Nullah, inundating riverside establishments in Old Manali, washing away timber bridges, and flooding the Atal Tunnel bypass link.",
        "source_citation": "State Emergency Operation Centre (SEOC) Himachal Pradesh Incident Report July 2023"
    },
    {
        "location_name": "Dharamshala / Bhagsunag Falls",
        "event_date": "2021-07-12",
        "event_type": "flash_flood",
        "trigger_rainfall_mm": 119.0,
        "river_level_at_peak": 6.8,
        "casualties": 4,
        "description": "Sudden micro-cloudburst in the Dhauladhar foothills above Bhagsunag triggered flash flooding in Manjhi Khad, washing away parked vehicles down nullahs and damaging tourist hotels and access bridges in McLeod Ganj.",
        "source_citation": "India Meteorological Department (IMD) Meteorological Centre Shimla Special Radar Advisory, July 2021"
    },
    {
        "location_name": "Uttarkashi / Bhagirathi Valley",
        "event_date": "2012-08-04",
        "event_type": "cloudburst",
        "trigger_rainfall_mm": 185.0,
        "river_level_at_peak": 11.1,
        "casualties": 35,
        "description": "Devastating cloudburst in the Asi Ganga catchment generated massive flash floods carrying boulders and uprooted pine logs, demolishing the Joshiyara suspension bridge, washing away the Gangotri NH-34 roadway, and flooding Tiloth village.",
        "source_citation": "Uttarakhand State Disaster Management Authority (USDMA) Asi Ganga Flood Investigation 2012"
    },
    {
        "location_name": "Mandi / Pandoh Gorge",
        "event_date": "2023-08-14",
        "event_type": "landslide",
        "trigger_rainfall_mm": 168.0,
        "river_level_at_peak": 12.6,
        "casualties": 19,
        "description": "Torrential overnight downpours saturated the gorge slopes, causing catastrophic landslides and debris flows at Sambhal and Pandoh along the Beas River, blocking highway traffic and flooding lower dam colony habitations.",
        "source_citation": "National Disaster Response Force (NDRF) 14th Battalion Mandi Search & Rescue Log, August 2023"
    }
]

def seed_historical_events_if_needed(db):
    """Populates historical disaster inventory records if they don't already exist."""
    existing_events = db.query(HistoricalEvent).count()
    if existing_events > 0:
        logger.info(f"Database already contains {existing_events} historical disaster records. Skipping events seed.")
        return

    logger.info(f"Seeding {len(HISTORICAL_DISASTER_EVENTS)} real documented historical disaster inventory records...")
    locations_by_name = {loc.name: loc for loc in db.query(Location).all()}

    seeded_count = 0
    for item in HISTORICAL_DISASTER_EVENTS:
        loc = locations_by_name.get(item["location_name"])
        if not loc:
            logger.warning(f"Could not find station '{item['location_name']}' for historical event.")
            continue

        event = HistoricalEvent(
            location_id=loc.id,
            event_date=item["event_date"],
            event_type=item["event_type"],
            trigger_rainfall_mm=item.get("trigger_rainfall_mm"),
            river_level_at_peak=item.get("river_level_at_peak"),
            casualties=item.get("casualties"),
            description=item["description"],
            source_citation=item["source_citation"]
        )
        db.add(event)
        seeded_count += 1

    db.commit()
    logger.info(f"Successfully seeded {seeded_count} historical disaster events.")

def seed_sensor_devices_if_needed(db):
    """Populates IoT SensorDevice records for each location if not present."""
    existing_devices = db.query(SensorDevice).count()
    if existing_devices > 0:
        logger.info(f"Database already contains {existing_devices} IoT sensor devices. Skipping devices seed.")
        return

    logger.info("Seeding IoT sensor devices for monitoring stations...")
    locations = db.query(Location).all()
    seeded_count = 0

    for loc in locations:
        device = SensorDevice(
            device_id=f"HIM-HYDRO-{loc.id:02d}",
            location_id=loc.id,
            api_key=f"fg_live_{loc.id:02d}_key",
            name=f"Telemetry Node - {loc.name}",
            device_type="Hydro-Met Telemetry Node (Cellular / LoRaWAN)",
            last_seen_at=datetime.utcnow(),
            battery_pct=round(96.0 - ((loc.id * 3.7) % 28.0), 1),  # 68% to 96%
            firmware_version="v2.4.2-prod",
            status="ONLINE",
            transmission_interval_sec=15
        )
        db.add(device)
        seeded_count += 1

    db.commit()
    logger.info(f"Successfully seeded {seeded_count} IoT sensor devices.")

def seed_database():
    """Initializes tables and seeds locations, infrastructure, historical telemetry & ML predictions."""
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        existing_count = db.query(Location).count()
        if existing_count > 0:
            logger.info(f"Database already contains {existing_count} locations.")
            seed_historical_events_if_needed(db)
            seed_sensor_devices_if_needed(db)
            return

        # Train ML model first
        logger.info("Initializing and training ML model for seed inferences...")
        flood_model.train()

        now = datetime.utcnow()
        logger.info(f"Seeding {len(HIMALAYAN_LOCATIONS)} Himalayan monitoring stations...")

        for loc_data in HIMALAYAN_LOCATIONS:
            infra_items = loc_data.pop("infrastructure", [])

            loc = Location(
                name=loc_data["name"],
                lat=loc_data["lat"],
                lng=loc_data["lng"],
                district=loc_data["district"],
                state=loc_data["state"],
                slope=loc_data["slope"],
                elevation=loc_data["elevation"],
                river_name=loc_data["river_name"],
                danger_river_level=loc_data["danger_river_level"],
                scenario=loc_data.get("scenario", "NORMAL"),
                scenario_step=3 if loc_data.get("scenario") != "NORMAL" else 0
            )
            db.add(loc)
            db.flush()

            # Seed infrastructure
            for inf in infra_items:
                infra = Infrastructure(
                    location_id=loc.id,
                    name=inf["name"],
                    type=inf["type"],
                    lat=inf["lat"],
                    lng=inf["lng"],
                    population_estimate=inf.get("population_estimate")
                )
                db.add(infra)

            # Generate 20 historical readings
            for i in range(20, -1, -1):
                timestamp = now - timedelta(minutes=i * 15)
                reading_dict = generate_reading_for_location(
                    loc,
                    timestamp=timestamp,
                    step_offset=max(0, loc.scenario_step - (i // 3))
                )
                reading = SensorReading(**reading_dict)
                db.add(reading)
                db.flush()

                # Generate ML risk prediction
                features = {
                    "rainfall_1h": reading.rainfall_1h,
                    "rainfall_3h": reading.rainfall_3h,
                    "rainfall_6h": reading.rainfall_6h,
                    "rainfall_24h": reading.rainfall_24h,
                    "temperature": reading.temperature,
                    "humidity": reading.humidity,
                    "river_level": reading.river_level,
                    "river_level_change_rate": reading.river_level_change_rate,
                    "soil_moisture": reading.soil_moisture,
                    "slope": loc.slope,
                    "elevation": loc.elevation,
                    "distance_from_river": reading.distance_from_river,
                    "forecast_rainfall_next_3h": reading.forecast_rainfall_next_3h
                }
                pred = flood_model.predict_risk(features)

                prediction = RiskPrediction(
                    location_id=loc.id,
                    timestamp=timestamp,
                    risk_score=pred["risk_score"],
                    risk_level=pred["risk_level"],
                    warning_window_minutes=pred["warning_window_minutes"],
                    contributions_json=json.dumps(pred["feature_contributions"])
                )
                db.add(prediction)

                # If this is the latest and level is high, generate alert
                if i == 0 and pred["risk_level"] in ["WARNING", "CRITICAL"]:
                    alert = Alert(
                        location_id=loc.id,
                        risk_level=pred["risk_level"],
                        message=f"{pred['risk_level']} ALERT: High flood potential at {loc.name} on {loc.river_name}. AI Risk Score: {pred['risk_score']}%.",
                        action_recommended="Stage evacuation protocols and issue alert siren to nearby settlements.",
                        created_at=timestamp
                    )
                    db.add(alert)

        # Seed historical disaster events
        seed_historical_events_if_needed(db)
        seed_sensor_devices_if_needed(db)

        db.commit()
        logger.info("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}", exc_info=True)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
