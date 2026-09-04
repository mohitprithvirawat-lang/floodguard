import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import SessionLocal
from app.seed import seed_database
from app.services.simulation import run_simulation_tick, sim_state
from app.routers import locations, risk, impact, alerts, simulate, websocket, sms, ml_analytics, iot
from app.routers.websocket import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("floodguard.main")

async def background_simulation_loop():
    """Background ticker that simulates real-time sensor updates and pushes via WebSockets every 5-6s."""
    logger.info("Starting background hydrological simulation loop...")
    while True:
        try:
            await asyncio.sleep(settings.SIMULATION_INTERVAL_SECONDS)
            if sim_state.is_running:
                db = SessionLocal()
                try:
                    tick_payload = run_simulation_tick(db)
                    await ws_manager.broadcast_live(tick_payload)
                    for alert in tick_payload.get("new_alerts", []):
                        await ws_manager.broadcast_alert(alert)
                finally:
                    db.close()
        except asyncio.CancelledError:
            logger.info("Background simulation loop cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in background simulation loop: {e}", exc_info=True)
            await asyncio.sleep(5)

async def background_weather_refresh_loop():
    """Periodically fetches real precipitation forecasts from Open-Meteo API every 15 minutes."""
    logger.info("Starting background Open-Meteo weather sync loop (15-min cadence)...")
    while True:
        try:
            await asyncio.sleep(900)  # 15 minutes
            db = SessionLocal()
            try:
                from app.models import Location
                from app.services.weather_service import open_meteo_service
                locations = db.query(Location).all()
                if locations:
                    open_meteo_service.refresh_all_locations(locations)
            finally:
                db.close()
        except asyncio.CancelledError:
            logger.info("Background Open-Meteo weather loop cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in background weather refresh loop: {e}", exc_info=True)
            await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed database & train ML model
    logger.info("Initializing FloodGuard Decision Support System...")
    seed_database()

    # Start background tasks
    async def initial_weather_sync():
        try:
            from app.models import Location
            from app.services.weather_service import open_meteo_service
            db = SessionLocal()
            try:
                locations = db.query(Location).all()
                if locations:
                    logger.info("Triggering initial live Open-Meteo forecast sync for monitoring stations in background...")
                    loop = asyncio.get_running_loop()
                    await loop.run_in_executor(None, open_meteo_service.refresh_all_locations, locations)
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Initial Open-Meteo sync deferred: {e}")

    init_weather_task = asyncio.create_task(initial_weather_sync())
    ticker_task = asyncio.create_task(background_simulation_loop())
    weather_task = asyncio.create_task(background_weather_refresh_loop())
    yield
    # Shutdown
    init_weather_task.cancel()
    ticker_task.cancel()
    weather_task.cancel()
    try:
        await ticker_task
        await weather_task
    except asyncio.CancelledError:
        pass
    logger.info("FloodGuard backend shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Flash Flood Early Warning & Decision-Support System for Hilly Regions (Smart India Hackathon Demo)",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for flexible local dev / presentation
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(locations.router)
app.include_router(risk.router)
app.include_router(impact.router)
app.include_router(alerts.router)
app.include_router(simulate.router)
app.include_router(websocket.router)
app.include_router(sms.router)
app.include_router(ml_analytics.router)
app.include_router(iot.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "system": "FloodGuard Decision Support Backend",
        "version": "1.0.0",
        "tick_count": sim_state.tick_count
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to FloodGuard AI Early Warning API",
        "docs": "/docs",
        "health": "/api/health",
        "risk_map": "/api/risk-map",
        "locations": "/api/locations",
        "alerts": "/api/alerts",
        "simulate": "/api/simulate/status"
    }
