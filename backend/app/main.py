import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.models.database import init_db, SessionLocal
from app.api.routes import router, ensure_db_seeded
from app.services.world_monitor import world_monitor_service


import logging

logger = logging.getLogger("earthwatch")


async def _run_sync_with_session():
    db = SessionLocal()
    try:
        await world_monitor_service.sync_all_live_telemetry(db)
    except Exception as exc:
        logger.warning(f"World telemetry sync error: {exc}")
    finally:
        db.close()


async def periodic_world_telemetry_sync():
    """Background worker that continuously pulls fresh real-time feeds every 5 minutes."""
    while True:
        try:
            await asyncio.sleep(300)  # 5 min cadence
            await _run_sync_with_session()
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning(f"Periodic sync encountered error: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    init_db()
    db = SessionLocal()
    try:
        ensure_db_seeded(db)
    finally:
        db.close()

    # Immediate background sync of live world monitor feeds with dedicated session
    asyncio.create_task(_run_sync_with_session())

    # Warm up local feeds asynchronously
    from app.data.nasa_eonet import fetch_nasa_eonet_events
    from app.data.usgs_data import fetch_usgs_local_earthquakes
    asyncio.create_task(fetch_usgs_local_earthquakes(0, 0, radius_km=100))
    asyncio.create_task(fetch_nasa_eonet_events(days=7, limit=100))

    # Start periodic background synchronization worker
    worker_task = asyncio.create_task(periodic_world_telemetry_sync())
    yield
    worker_task.cancel()


app = FastAPI(
    title="EarthWatch AI — Global Earth & Disaster Intelligence Platform API",
    description="Production-grade REST API powering 3D globe visualization, real-time satellite tracking, disaster monitoring, location intelligence, and AI analysis.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev and production
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "name": "EarthWatch AI Platform API",
        "tagline": "Understand what is happening anywhere on Earth.",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "earthwatch-backend"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
