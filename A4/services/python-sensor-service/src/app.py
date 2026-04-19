from fastapi import FastAPI
from routes.sensors import router as sensors_router
from middleware.correlation_id import CorrelationIdMiddleware
from db.connection import get_pool, initialize_database
import asyncio

app = FastAPI(
    title="Sensor Microservice API",
    description="IoT Smart Home Sensors microservice",
    version="2.0.0"
)

# Add correlation ID middleware
app.add_middleware(CorrelationIdMiddleware)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    try:
        await initialize_database()
    except Exception as e:
        print(f"Failed to initialize database: {e}")

# Health check endpoint with database status
@app.get("/health")
async def health():
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval('SELECT 1')
        return {"status": "ok", "service": "python", "database": "connected"}
    except Exception as e:
        return {"status": "error", "service": "python", "database": "disconnected", "error": str(e)}

# Include sensor routes
app.include_router(sensors_router)
