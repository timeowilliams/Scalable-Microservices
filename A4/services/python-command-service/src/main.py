import uvicorn
from config.config import Config

if __name__ == "__main__":
    config = Config()
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=config.get_port(),
        workers=config.get_workers(),
        reload=False
    )
