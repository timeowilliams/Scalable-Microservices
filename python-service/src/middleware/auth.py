from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dependencies import get_api_key


security = HTTPBearer()


async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Security(security),
    api_key: str = Depends(get_api_key)
) -> str:
    """
    Verify API key from Bearer token.
    This is a dependency that will be injected into protected routes.
    """
    token = credentials.credentials
    
    # Validate token syntactically (full OAuth later)
    if token != api_key:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized - Invalid or missing API key"
        )

    return token
