from typing import Dict, List, Optional, Any
from datetime import datetime


class SensorRepository:
    def __init__(self, pool):
        self._pool = pool

    async def find_all(self) -> List[Dict[str, Any]]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch('SELECT * FROM sensors ORDER BY timestamp DESC')
            return [
                {
                    'sensor_id': row['sensor_id'],
                    'type': row['type'],
                    'value': float(row['value']),
                    'unit': row['unit'],
                    'timestamp': row['timestamp'].isoformat() + 'Z'
                }
                for row in rows
            ]

    async def find_by_id(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT * FROM sensors WHERE sensor_id = $1',
                sensor_id
            )
            
            if not row:
                return None
            
            return {
                'sensor_id': row['sensor_id'],
                'type': row['type'],
                'value': float(row['value']),
                'unit': row['unit'],
                'timestamp': row['timestamp'].isoformat() + 'Z'
            }

    async def create(self, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._pool.acquire() as conn:
            # Convert timestamp string to datetime if needed
            timestamp = sensor_data['timestamp']
            if isinstance(timestamp, str):
                # Parse ISO format timestamp
                if timestamp.endswith('Z'):
                    timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                else:
                    timestamp = datetime.fromisoformat(timestamp)
                # Convert to UTC and make timezone-naive for PostgreSQL
                if timestamp.tzinfo is not None:
                    timestamp = timestamp.astimezone().replace(tzinfo=None)
            
            row = await conn.fetchrow(
                '''INSERT INTO sensors (sensor_id, type, value, unit, timestamp)
                   VALUES ($1, $2, $3, $4, $5)
                   RETURNING *''',
                sensor_data['sensor_id'],
                sensor_data['type'],
                sensor_data['value'],
                sensor_data['unit'],
                timestamp
            )
            
            return {
                'sensor_id': row['sensor_id'],
                'type': row['type'],
                'value': float(row['value']),
                'unit': row['unit'],
                'timestamp': row['timestamp'].isoformat() + 'Z'
            }

    async def exists(self, sensor_id: str) -> bool:
        async with self._pool.acquire() as conn:
            result = await conn.fetchval(
                'SELECT EXISTS(SELECT 1 FROM sensors WHERE sensor_id = $1)',
                sensor_id
            )
            return result
