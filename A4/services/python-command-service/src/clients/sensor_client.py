import requests
import httpx
import asyncio
from typing import List, Dict, Any, Optional
from config.config import Config
import time


# Circuit Breaker implementation
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.last_failure_time = None

    async def call(self, func, *args, **kwargs):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
            else:
                raise Exception("Circuit breaker is OPEN: dependency unavailable")

        try:
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            self.failures = 0
            self.state = "CLOSED"
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure_time = time.time()

            if self.failures >= self.failure_threshold:
                self.state = "OPEN"

            raise


circuit_breaker = CircuitBreaker(5, 30)


class SensorClient:
    def __init__(self):
        config = Config()
        self.base_url = config.get_sensor_service_url()
        # Bulkhead: Separate session for sync calls with connection limits
        self.sync_session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(pool_connections=5, pool_maxsize=5)
        self.sync_session.mount('http://', adapter)
        self.sync_session.mount('https://', adapter)
        
        # Bulkhead: Separate async client for async calls
        self.async_client = httpx.AsyncClient(
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            timeout=10.0
        )

    # Synchronous call - blocking, simple operation
    def get_sensor_sync(self, sensor_id: str) -> Dict[str, Any]:
        try:
            response = self.sync_session.get(
                f"{self.base_url}/sensors/{sensor_id}",
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise Exception(f"Failed to fetch sensor {sensor_id}: {str(e)}")
    
    def __del__(self):
        """Cleanup on deletion"""
        if hasattr(self, 'sync_session'):
            self.sync_session.close()

    # Asynchronous parallel calls - non-blocking, batch operations
    async def get_sensors_async(self, sensor_ids: List[str]) -> List[Dict[str, Any]]:
        async def fetch_sensor(sensor_id):
            try:
                response = await self.async_client.get(f"{self.base_url}/sensors/{sensor_id}")
                response.raise_for_status()
                return response.json()
            except Exception as e:
                return {"error": str(e), "sensor_id": sensor_id}

        tasks = [circuit_breaker.call(fetch_sensor, sensor_id) for sensor_id in sensor_ids]
        return await asyncio.gather(*tasks)

    # Get all sensors
    async def get_all_sensors(self, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        filters = filters or {}
        params = {}
        if 'type' in filters:
            params['type'] = filters['type']
        if 'limit' in filters:
            params['limit'] = filters['limit']
        if 'offset' in filters:
            params['offset'] = filters['offset']

        async def fetch_all():
            response = await self.async_client.get(f"{self.base_url}/sensors", params=params)
            response.raise_for_status()
            return response.json()

        return await circuit_breaker.call(fetch_all)

    async def close(self):
        await self.async_client.aclose()
