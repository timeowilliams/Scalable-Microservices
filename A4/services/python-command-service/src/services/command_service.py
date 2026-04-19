from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid


class CommandService:
    def __init__(self, dashboard_repository, alert_repository, sensor_client, logger):
        self.dashboard_repository = dashboard_repository
        self.alert_repository = alert_repository
        self.sensor_client = sensor_client
        self.logger = logger

    async def get_all_dashboards(self) -> List[Dict[str, Any]]:
        self.logger.info('Fetching all dashboards')
        return await self.dashboard_repository.find_all()

    async def get_dashboard_by_id(self, dashboard_id: str) -> Dict[str, Any]:
        self.logger.info('Fetching dashboard', {'dashboard_id': dashboard_id})
        dashboard = await self.dashboard_repository.find_by_id(dashboard_id)
        if not dashboard:
            raise ValueError('Dashboard not found')
        return dashboard

    async def create_dashboard(self, dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        dashboard_id = dashboard_data.get('dashboard_id') or f"dashboard_{uuid.uuid4()}"
        self.logger.info('Creating dashboard', {'dashboard_id': dashboard_id})

        dashboard = {
            'dashboard_id': dashboard_id,
            'mission_id': dashboard_data.get('mission_id'),
            'sensor_summary': dashboard_data.get('sensor_summary', {}),
            'threat_level': dashboard_data.get('threat_level', 'low'),
            'status': dashboard_data.get('status', 'active')
        }

        return await self.dashboard_repository.create(dashboard)

    # Synchronous: Fetch single sensor for validation
    async def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        alert_id = alert_data.get('alert_id') or f"alert_{uuid.uuid4()}"
        self.logger.info('Creating alert', {'alert_id': alert_id})

        # Sync call to validate sensor exists
        try:
            self.sensor_client.get_sensor_sync(alert_data['sensor_id'])
        except Exception as e:
            raise ValueError(f"Sensor {alert_data['sensor_id']} not found")

        alert = {
            'alert_id': alert_id,
            'sensor_id': alert_data['sensor_id'],
            'alert_type': alert_data.get('alert_type', 'general'),
            'severity': alert_data.get('severity', 'medium'),
            'message': alert_data.get('message', 'Alert triggered')
        }

        return await self.alert_repository.create(alert)

    async def get_all_alerts(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        filters = filters or {}
        self.logger.info('Fetching all alerts', {'filters': filters})
        return await self.alert_repository.find_all(filters)

    async def acknowledge_alert(self, alert_id: str) -> Dict[str, Any]:
        self.logger.info('Acknowledging alert', {'alert_id': alert_id})
        alert = await self.alert_repository.acknowledge(alert_id)
        if not alert:
            raise ValueError('Alert not found')
        return alert

    # Asynchronous: Aggregate multiple sensors in parallel
    async def aggregate_sensors(self, sensor_ids: List[str]) -> Dict[str, Any]:
        self.logger.info('Aggregating sensors', {'sensor_ids': sensor_ids})

        # Async parallel calls
        sensors = await self.sensor_client.get_sensors_async(sensor_ids)

        summary = {
            'total': len(sensors),
            'by_type': {},
            'values': [],
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        for sensor in sensors:
            if 'error' not in sensor:
                summary['by_type'][sensor['type']] = summary['by_type'].get(sensor['type'], 0) + 1
                summary['values'].append({
                    'sensor_id': sensor['sensor_id'],
                    'type': sensor['type'],
                    'value': sensor['value'],
                    'unit': sensor['unit']
                })

        return summary

    # Asynchronous: Mission planning with parallel sensor fetches
    async def create_mission_plan(self, mission_data: Dict[str, Any]) -> Dict[str, Any]:
        mission_id = mission_data.get('mission_id') or f"mission_{uuid.uuid4()}"
        self.logger.info('Creating mission plan', {'mission_id': mission_id})

        # Fetch all sensors asynchronously
        all_sensors_data = await self.sensor_client.get_all_sensors()
        sensors = all_sensors_data.get('data', [])

        # Analyze sensor data for threat assessment
        threat_level = self._assess_threat_level(sensors)
        sensor_summary = {
            'total_sensors': len(sensors),
            'sensor_types': self._group_by_type(sensors),
            'critical_sensors': [
                s for s in sensors
                if (s['type'] == 'motion' and s['value'] == 1) or
                   (s['type'] == 'temperature' and (s['value'] > 100 or s['value'] < 32))
            ]
        }

        dashboard = {
            'dashboard_id': f"dashboard_{mission_id}",
            'mission_id': mission_id,
            'sensor_summary': sensor_summary,
            'threat_level': threat_level,
            'status': 'active'
        }

        return await self.dashboard_repository.create(dashboard)

    # Asynchronous: Threat assessment with parallel sensor fetches
    async def assess_threats(self, sensor_ids: List[str]) -> Dict[str, Any]:
        self.logger.info('Assessing threats', {'sensor_ids': sensor_ids})

        # Async parallel calls to fetch multiple sensors
        sensors = await self.sensor_client.get_sensors_async(sensor_ids)

        threats = []
        for sensor in sensors:
            if 'error' not in sensor:
                if sensor['type'] == 'motion' and sensor['value'] == 1:
                    threats.append({
                        'sensor_id': sensor['sensor_id'],
                        'type': 'motion_detected',
                        'severity': 'high',
                        'message': f"Motion detected at {sensor['sensor_id']}"
                    })
                elif sensor['type'] == 'temperature' and sensor['value'] > 100:
                    threats.append({
                        'sensor_id': sensor['sensor_id'],
                        'type': 'temperature_high',
                        'severity': 'critical',
                        'message': f"High temperature detected: {sensor['value']}{sensor['unit']}"
                    })

        return {
            'threat_level': 'high' if threats else 'low',
            'threats': threats,
            'assessed_at': datetime.utcnow().isoformat() + 'Z'
        }

    def _assess_threat_level(self, sensors: List[Dict[str, Any]]) -> str:
        has_motion = any(s['type'] == 'motion' and s['value'] == 1 for s in sensors)
        has_high_temp = any(s['type'] == 'temperature' and s['value'] > 100 for s in sensors)

        if has_motion and has_high_temp:
            return 'critical'
        if has_motion or has_high_temp:
            return 'high'
        return 'low'

    def _group_by_type(self, sensors: List[Dict[str, Any]]) -> Dict[str, int]:
        grouped = {}
        for sensor in sensors:
            grouped[sensor['type']] = grouped.get(sensor['type'], 0) + 1
        return grouped
