import time
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


# Rate Limiter implementation (Token Bucket Algorithm)
class RateLimiter:
    def __init__(self, rate: float, capacity: int):
        self.rate = rate  # tokens per second
        self.capacity = capacity  # max tokens
        self.tokens = capacity
        self.last_check = time.time()

    def allow_request(self) -> bool:
        now = time.time()
        elapsed = now - self.last_check
        self.last_check = now

        # Add tokens based on elapsed time
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)

        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False


# Create rate limiters for different endpoints
general_limiter = RateLimiter(100.0, 200)  # 100 req/sec, burst 200
write_limiter = RateLimiter(50.0, 100)  # 50 req/sec, burst 100


class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Use stricter limits for write operations
        is_write_operation = request.method in ['POST', 'PATCH', 'PUT', 'DELETE']
        limiter = write_limiter if is_write_operation else general_limiter

        if limiter.allow_request():
            response = await call_next(request)
            return response
        else:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
