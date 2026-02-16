from fastapi import FastAPI
from routes.sensors import router as sensors_router
from middleware.correlation_id import CorrelationIdMiddleware

app = FastAPI(
    title="Sensor Microservice API",
    description="IoT Smart Home Sensors microservice",
    version="2.0.0"
)

# Add correlation ID middleware
app.add_middleware(CorrelationIdMiddleware)

# Health check endpoint
@app.get("/health")
async def health():
    return {"status": "ok", "service": "python"}

# Include sensor routes
app.include_router(sensors_router)
