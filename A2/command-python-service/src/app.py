from fastapi import FastAPI
from routes.command import router as command_router
from middleware.correlation_id import CorrelationIdMiddleware
from middleware.rate_limiter import RateLimiterMiddleware
from db.connection import get_pool, initialize_database
from dependencies import get_dashboard_repository, get_alert_repository, get_logger
from events.event_subscriber import EventSubscriber
import asyncio
import threading

app = FastAPI(
    title="Command & Control Microservice API",
    description="Tactical Command & Control service for military/IoT edge scenarios",
    version="2.0.0"
)

# Add middleware
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(RateLimiterMiddleware)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    try:
        await initialize_database()
        
        # Start event subscriber in background thread
        dashboard_repo = await get_dashboard_repository()
        alert_repo = await get_alert_repository()
        logger = get_logger()
        event_subscriber = EventSubscriber(dashboard_repo, alert_repo, logger)
        
        def run_subscriber():
            event_subscriber.start()
        
        subscriber_thread = threading.Thread(target=run_subscriber, daemon=True)
        subscriber_thread.start()
    except Exception as e:
        print(f"Failed to initialize database: {e}")

# Health check endpoint with database status
@app.get("/health")
async def health():
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval('SELECT 1')
        return {"status": "ok", "service": "python-command", "database": "connected"}
    except Exception as e:
        return {"status": "error", "service": "python-command", "database": "disconnected", "error": str(e)}

# Include command routes
app.include_router(command_router)
