# FloodGuard 🛡️ — AI-Powered Flash Flood Early Warning System for Hilly Regions

> **Smart India Hackathon (SIH) Decision-Support Prototype**  
> Real-time multivariate hydrological data fusion, physics-guided Machine Learning risk scoring with Explainable AI (XAI), GIS spatial mapping, infrastructure vulnerability impact analysis, and live disaster response coordination for Himalayan mountain river basins.

---

## 🏔️ System Architecture

```
                                  MULTI-SOURCE TELEMETRY ENGINE
        [ Weather Radar ]      [ River Gauges (m/h) ]      [ Soil Saturation ]      [ Terrain GIS (Slope/Elev) ]
                │                       │                          │                           │
                └───────────────────────┴────────────┬─────────────┴───────────────────────────┘
                                                     ▼
                                     FASTAPI DATA FUSION PIPELINE
                                                     │
                                                     ▼
                                    RANDOM FOREST INFERENCE ENGINE
                            ┌────────────────────────┴────────────────────────┐
                            ▼                                                 ▼
             Continuous Risk Score (0-100%)                       Discrete Early Warning Level
               & Warning Reaction Window                           (NORMAL | WATCH | WARNING | CRITICAL)
                            │                                                 │
                            └────────────────────────┬────────────────────────┘
                                                     ▼
                                      EXPLAINABLE AI DECOMPOSITION
                                  (Feature Contribution Relative Impact)
                                                     │
                                                     ▼
                             INFRASTRUCTURE IMPACT & EVACUATION PRIORITY
                                 (Villages, Bridges, Hospitals, Schools)
                                                     │
                     ┌───────────────────────────────┴───────────────────────────────┐
                     ▼                                                               ▼
        FASTAPI REST API ENDPOINTS                                      WEBSOCKET LIVE TELEMETRY
           (/api/risk-map, /api/impact)                                    (/ws/live, /ws/alerts)
                     │                                                               │
                     └───────────────────────────────┬───────────────────────────────┘
                                                     ▼
                                  NEXT.JS 14 COMMAND CENTER DASHBOARD
                         (Leaflet GIS Radar, Recharts Time-Series, Live Alerts, Sim Pad)
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **GIS Mapping**: Leaflet.js (`react-leaflet`) with OpenStreetMap/Carto Voyager tiles & animated risk pulse markers
- **Data Visualizations**: Recharts (Hydro time-series, precipitation forecast, river stage thresholds, Explainable AI factor bar charts)
- **Icons & UI**: Lucide React, Command-Center Dark Theme (#0b0f19, #111827)
- **Backend**: Python 3.11+ FastAPI (Async Lifespan, WebSocket connection manager, Background ticker)
- **Database**: PostgreSQL / SQLite via SQLAlchemy ORM (Pre-seeded with 10 Himalayan stations across Uttarakhand & Himachal Pradesh)
- **Machine Learning**: `scikit-learn` RandomForestClassifier & RandomForestRegressor trained on multivariate mountain hydrology data
- **Real-Time Engine**: FastAPI WebSockets with automatic reconnection and live telemetry broadcast (5s intervals)

---

## ⚡ Quickstart Guide

### 1. Prerequisites
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** and **npm**

### 2. Backend Setup
```bash
# Navigate to backend folder
cd backend

# (Optional) Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the database seeding & ML model training script
python -m app.seed

# Start the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
> The API will be running at `http://localhost:8000`. Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
# In a new terminal window, navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```
> The FloodGuard Command Dashboard will be accessible at `http://localhost:3000`.

---

## 🎯 Smart India Hackathon Demonstration Guide (Judge Script)

### Step 1: Overview Dashboard (`http://localhost:3000`)
- Observe the **Himalayan GIS Threat Radar** displaying monitored river basins across Uttarakhand and Himachal Pradesh (Chamoli, Kedarnath, Joshimath, Kullu, Manali, Dharamshala, Uttarkashi, Mandi, Rishikesh, Shimla).
- Review the **Real-time Stat Cards** showing Active Warnings, Critical Risk Zones, and Peak River Surge Rates.
- Check the **Live Threat Feed** sidebar showing real-time advisories and early warnings.

### Step 2: Station Deep Dive (`/location/[id]`)
- Click on any station marker on the map (or from the sidebar) to open its dedicated station analysis.
- **AI Risk Gauge**: View the calibrated flash flood probability (0 - 100%) and estimated reaction window countdown.
- **Explainable AI (XAI)**: Show judges the **Risk Factor Decomposition Bar Chart** explaining *why* the AI assigned the risk score (e.g. 3-Hour Rainfall 34%, River Surge Velocity 28%, Soil Moisture 21%).
- **Hydrological Charts**: Review the precipitation accumulation vs forecast curve and the river stage trend vs critical danger mark.
- **Evacuation Priority Order**: Inspect nearby villages, schools, bridges, and hospitals ranked by vulnerability score and proximity with actionable civil defense directives.

### Step 3: Real-Time Live Scenario Simulation (`/simulate`)
- Navigate to the **Simulation Control Panel**.
- Trigger **"Cloudburst & Flash Flood Imminent"** on the **Kedarnath / Gaurikund** station.
- Switch back to the **Overview Dashboard** or watch the live telemetry log:
  - Telemetry changes immediately over WebSockets without requiring a page refresh.
  - Kedarnath marker turns **pulsing red** with risk index surging to >85% (CRITICAL).
  - A **Priority-1 Evacuation Siren Alert** is dispatched to the live alert feed.
  - The station evacuation table automatically re-orders the highest vulnerability settlements to Priority #1.
- Click **"Apply Normal Baseline"** or **"Reset All"** to demonstrate recovery mode.

---

## 📊 Monitored Himalayan Basins

| Station Name | Basin / River | District, State | Elevation | Slope | Danger Mark |
|---|---|---|---|---|---|
| **Chamoli / Rishi Ganga** | Rishi Ganga / Alaknanda | Chamoli, Uttarakhand | 1,900 m | 38.5° | 7.5 m |
| **Kedarnath / Gaurikund** | Mandakini River | Rudraprayag, Uttarakhand | 3,584 m | 44.0° | 6.0 m |
| **Joshimath / Vishnuprayag** | Alaknanda / Dhauliganga | Chamoli, Uttarakhand | 1,890 m | 41.2° | 8.0 m |
| **Kullu / Bhuntar** | Beas / Parvati Confluence | Kullu, Himachal Pradesh | 1,278 m | 34.0° | 8.5 m |
| **Manali / Solang** | Upper Beas River | Kullu, Himachal Pradesh | 2,050 m | 39.5° | 6.5 m |
| **Dharamshala / Bhagsu** | Manjhi Khad | Kangra, Himachal Pradesh | 1,457 m | 36.8° | 5.5 m |
| **Uttarkashi** | Bhagirathi River | Uttarkashi, Uttarakhand | 1,158 m | 32.4° | 9.0 m |
| **Mandi / Pandoh Gorge** | Beas River Gorge | Mandi, Himachal Pradesh | 760 m | 29.0° | 10.0 m |
| **Rishikesh / Tapovan** | Ganga River | Dehradun, Uttarakhand | 372 m | 18.0° | 14.0 m |
| **Shimla / Sunni** | Sutlej River | Shimla, Himachal Pradesh | 655 m | 31.5° | 8.0 m |

---

## 🛡️ License
Built for the Smart India Hackathon (SIH). Open Source under the MIT License.
