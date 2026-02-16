from typing import Optional, Dict, Any
from fastapi import HTTPException, Query, Request
from services.sensor_service import SensorService
from services.logger import Logger


class SensorController:
    def __init__(self, service: SensorService, logger: Logger):
        self.service = service
        self.logger = logger

    async def get_all_sensors(
        self,
        request: Request,
        type: Optional[str] = Query(None),
        limit: Optional[int] = Query(None),
        offset: int = Query(0)
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            filters = {'type': type, 'limit': limit, 'offset': offset}
            sensors = self.service.get_all_sensors(filters)
            
            return {'data': sensors, 'count': len(sensors)}
        except Exception as e:
            self.logger.error('Error fetching sensors', {'error': str(e)})
            raise HTTPException(status_code=500, detail='Internal server error')

    async def get_sensor_by_id(
        self,
        request: Request,
        sensor_id: str
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            return self.service.get_sensor_by_id(sensor_id)
        except ValueError as e:
            if 'not found' in str(e):
                raise HTTPException(status_code=404, detail='Sensor not found')
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            self.logger.error('Error fetching sensor', {'error': str(e)})
            raise HTTPException(status_code=500, detail='Internal server error')

    async def create_sensor(
        self,
        request: Request,
        sensor_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            correlation_id = getattr(request.state, 'correlation_id', None)
            self.logger.set_correlation_id(correlation_id or '')

            created = self.service.create_sensor(sensor_data)
            return created
        except ValueError as e:
            if 'already exists' in str(e):
                raise HTTPException(status_code=409, detail=str(e))
            if 'out of valid range' in str(e) or 'must be' in str(e):
                raise HTTPException(status_code=400, detail=str(e))
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            self.logger.error('Error creating sensor', {'error': str(e)})
            raise HTTPException(status_code=500, detail='Internal server error')
