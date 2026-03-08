from typing import Dict, List, Optional, Any
import json


class DashboardRepository:
    def __init__(self, pool):
        self._pool = pool

    async def find_all(self) -> List[Dict[str, Any]]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch('SELECT * FROM tactical_dashboards ORDER BY created_at DESC')
            return [
                {
                    'dashboard_id': row['dashboard_id'],
                    'mission_id': row['mission_id'],
                    'sensor_summary': row['sensor_summary'],
                    'threat_level': row['threat_level'],
                    'status': row['status'],
                    'created_at': row['created_at'].isoformat() + 'Z',
                    'updated_at': row['updated_at'].isoformat() + 'Z'
                }
                for row in rows
            ]

    async def find_by_id(self, dashboard_id: str) -> Optional[Dict[str, Any]]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT * FROM tactical_dashboards WHERE dashboard_id = $1',
                dashboard_id
            )
            
            if not row:
                return None
            
            return {
                'dashboard_id': row['dashboard_id'],
                'mission_id': row['mission_id'],
                'sensor_summary': row['sensor_summary'],
                'threat_level': row['threat_level'],
                'status': row['status'],
                'created_at': row['created_at'].isoformat() + 'Z',
                'updated_at': row['updated_at'].isoformat() + 'Z'
            }

    async def create(self, dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                '''INSERT INTO tactical_dashboards (dashboard_id, mission_id, sensor_summary, threat_level, status)
                   VALUES ($1, $2, $3, $4, $5)
                   RETURNING *''',
                dashboard_data['dashboard_id'],
                dashboard_data['mission_id'],
                json.dumps(dashboard_data['sensor_summary']),
                dashboard_data['threat_level'],
                dashboard_data['status']
            )
            
            return {
                'dashboard_id': row['dashboard_id'],
                'mission_id': row['mission_id'],
                'sensor_summary': row['sensor_summary'],
                'threat_level': row['threat_level'],
                'status': row['status'],
                'created_at': row['created_at'].isoformat() + 'Z',
                'updated_at': row['updated_at'].isoformat() + 'Z'
            }

    async def update(self, dashboard_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        fields = []
        values = []
        param_count = 1

        if 'sensor_summary' in updates:
            fields.append(f'sensor_summary = ${param_count}')
            values.append(json.dumps(updates['sensor_summary']))
            param_count += 1
        if 'threat_level' in updates:
            fields.append(f'threat_level = ${param_count}')
            values.append(updates['threat_level'])
            param_count += 1
        if 'status' in updates:
            fields.append(f'status = ${param_count}')
            values.append(updates['status'])
            param_count += 1

        if not fields:
            return await self.find_by_id(dashboard_id)

        values.append(dashboard_id)
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f'''UPDATE tactical_dashboards SET {', '.join(fields)} 
                    WHERE dashboard_id = ${param_count} RETURNING *''',
                *values
            )
            
            return {
                'dashboard_id': row['dashboard_id'],
                'mission_id': row['mission_id'],
                'sensor_summary': row['sensor_summary'],
                'threat_level': row['threat_level'],
                'status': row['status'],
                'created_at': row['created_at'].isoformat() + 'Z',
                'updated_at': row['updated_at'].isoformat() + 'Z'
            }
