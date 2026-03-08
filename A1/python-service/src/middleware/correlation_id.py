import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Get or generate correlation ID
        correlation_id = request.headers.get('x-correlation-id') or \
                        f'req-{uuid.uuid4().hex[:16]}'
        
        request.state.correlation_id = correlation_id
        
        response = await call_next(request)
        response.headers['X-Correlation-ID'] = correlation_id
        
        return response
