from typing import Optional, Dict, Any
from fastapi import HTTPException, Query, Request
from services.command_service import CommandService
from services.logger import Logger


class CommandController:
    def __init__(self, service: CommandService, logger: Logger):
        self.service = service
        self.logger = logger

    async def get_all_dashboards(
        self,
        request: Request
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            dashboards = await self.service.get_all_dashboards()
            return {'data': dashboards, 'count': len(dashboards)}
        except Exception as e:
            self.logger.error('Error fetching dashboards', {'error': str(e)})
            raise HTTPException(status_code=500, detail='Internal server error')

    async def get_dashboard_by_id(
        self,
        request: Request,
        dashboard_id: str
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            return await self.service.get_dashboard_by_id(dashboard_id)
        except ValueError as e:
            if 'not found' in str(e):
                raise HTTPException(status_code=404, detail='Dashboard not found')
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            self.logger.error('Error fetching dashboard', {'error': str(e)})
            raise HTTPException(status_code=500, detail='Internal server error')

    async def create_dashboard(
        self,
        request: Request,
        dashboard_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            dashboard = await self.service.create_dashboard(dashboard_data)
            return dashboard
        except Exception as e:
            self.logger.error('Error creating dashboard', {'error': str(e)})
            raise HTTPException(status_code=400, detail=str(e))

    async def get_all_alerts(
        self,
        request: Request,
        acknowledged: Optional[bool] = Query(None),
        severity: Optional[str] = Query(None),
        limit: Optional[int] = Query(None),
        offset: int = Query(0)
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            filters = {
                'acknowledged': acknowledged,
                'severity': severity,
                'limit': limit,
                'offset': offset
            }
            filters = {k: v for k, v in filters.items() if v is not None}

            alerts = await self.service.get_all_alerts(filters)
            return {'data': alerts, 'count': len(alerts)}
        except Exception as e:
            self.logger.error('Error fetching alerts', {'error': str(e)})
            raise HTTPException(status_code=500, detail='Internal server error')

    async def create_alert(
        self,
        request: Request,
        alert_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            alert = await self.service.create_alert(alert_data)
            return alert
        except ValueError as e:
            if 'not found' in str(e):
                raise HTTPException(status_code=404, detail=str(e))
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            self.logger.error('Error creating alert', {'error': str(e)})
            raise HTTPException(status_code=400, detail=str(e))

    async def acknowledge_alert(
        self,
        request: Request,
        alert_id: str
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            return await self.service.acknowledge_alert(alert_id)
        except ValueError as e:
            if 'not found' in str(e):
                raise HTTPException(status_code=404, detail='Alert not found')
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            self.logger.error('Error acknowledging alert', {'error': str(e)})
            raise HTTPException(status_code=500, detail='Internal server error')

    # Async endpoint: Aggregate sensors in parallel
    async def aggregate_sensors(
        self,
        request: Request,
        sensor_ids: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            ids = sensor_ids.get('sensor_ids', [])
            if not ids:
                raise HTTPException(status_code=400, detail='sensor_ids array is required')

            summary = await self.service.aggregate_sensors(ids)
            return summary
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error('Error aggregating sensors', {'error': str(e)})
            raise HTTPException(status_code=500, detail='Internal server error')

    # Async endpoint: Create mission plan
    async def create_mission_plan(
        self,
        request: Request,
        mission_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            dashboard = await self.service.create_mission_plan(mission_data)
            return dashboard
        except Exception as e:
            self.logger.error('Error creating mission plan', {'error': str(e)})
            raise HTTPException(status_code=500, detail='Internal server error')

    # Async endpoint: Threat assessment
    async def assess_threats(
        self,
        request: Request,
        sensor_ids: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            ids = sensor_ids.get('sensor_ids', [])
            if not ids:
                raise HTTPException(status_code=400, detail='sensor_ids array is required')

            assessment = await self.service.assess_threats(ids)
            return assessment
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error('Error assessing threats', {'error': str(e)})
            raise HTTPException(status_code=500, detail='Internal server error')
