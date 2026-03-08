from typing import Dict, List, Optional, Any


class AlertRepository:
    def __init__(self, pool):
        self._pool = pool

    async def find_all(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        filters = filters or {}
        query = 'SELECT * FROM alerts WHERE 1=1'
        params = []
        param_count = 1

        if 'acknowledged' in filters:
            query += f' AND acknowledged = ${param_count}'
            params.append(filters['acknowledged'])
            param_count += 1
        if 'severity' in filters:
            query += f' AND severity = ${param_count}'
            params.append(filters['severity'])
            param_count += 1

        query += ' ORDER BY created_at DESC'

        if 'limit' in filters:
            query += f' LIMIT ${param_count}'
            params.append(filters['limit'])
            param_count += 1
            if 'offset' in filters:
                query += f' OFFSET ${param_count}'
                params.append(filters['offset'])
                param_count += 1

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [
                {
                    'alert_id': row['alert_id'],
                    'sensor_id': row['sensor_id'],
                    'alert_type': row['alert_type'],
                    'severity': row['severity'],
                    'message': row['message'],
                    'acknowledged': row['acknowledged'],
                    'created_at': row['created_at'].isoformat() + 'Z'
                }
                for row in rows
            ]

    async def find_by_id(self, alert_id: str) -> Optional[Dict[str, Any]]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT * FROM alerts WHERE alert_id = $1',
                alert_id
            )
            
            if not row:
                return None
            
            return {
                'alert_id': row['alert_id'],
                'sensor_id': row['sensor_id'],
                'alert_type': row['alert_type'],
                'severity': row['severity'],
                'message': row['message'],
                'acknowledged': row['acknowledged'],
                'created_at': row['created_at'].isoformat() + 'Z'
            }

    async def create(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                '''INSERT INTO alerts (alert_id, sensor_id, alert_type, severity, message)
                   VALUES ($1, $2, $3, $4, $5)
                   RETURNING *''',
                alert_data['alert_id'],
                alert_data['sensor_id'],
                alert_data['alert_type'],
                alert_data['severity'],
                alert_data['message']
            )
            
            return {
                'alert_id': row['alert_id'],
                'sensor_id': row['sensor_id'],
                'alert_type': row['alert_type'],
                'severity': row['severity'],
                'message': row['message'],
                'acknowledged': row['acknowledged'],
                'created_at': row['created_at'].isoformat() + 'Z'
            }

    async def acknowledge(self, alert_id: str) -> Optional[Dict[str, Any]]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                'UPDATE alerts SET acknowledged = TRUE WHERE alert_id = $1 RETURNING *',
                alert_id
            )
            
            if not row:
                return None
            
            return {
                'alert_id': row['alert_id'],
                'sensor_id': row['sensor_id'],
                'alert_type': row['alert_type'],
                'severity': row['severity'],
                'message': row['message'],
                'acknowledged': row['acknowledged'],
                'created_at': row['created_at'].isoformat() + 'Z'
            }
