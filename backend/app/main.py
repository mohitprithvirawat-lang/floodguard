import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import SessionLocal
from app.seed import seed_database
from app.services.simulation import run_simulation_tick, sim_state
from app.routers import locations, risk, impact, alerts, simulate, websocket
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
            if sim_state.is_running and ws_manager.active_connections:
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed database & train ML model
    logger.info("Initializing FloodGuard Decision Support System...")
    seed_database()

    # Start background real-time ticker
    ticker_task = asyncio.create_task(background_simulation_loop())
    yield
    # Shutdown
    ticker_task.cancel()
    try:
        await ticker_task
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
