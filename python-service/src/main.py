import uvicorn
from app import app
from config.config import Config

if __name__ == "__main__":
    config = Config()
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=config.get_port(),
        reload=False
    )
