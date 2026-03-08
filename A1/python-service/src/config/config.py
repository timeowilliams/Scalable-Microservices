import os
from typing import Optional


class Config:
    def __init__(self):
        self.port: int = int(os.getenv('PORT', '8000'))
        self.api_key: str = os.getenv('API_KEY', 'default-api-key-change-me')
        self.log_level: str = os.getenv('LOG_LEVEL', 'info')
        self.python_env: str = os.getenv('PYTHON_ENV', 'development')

    def get_port(self) -> int:
        return self.port

    def get_api_key(self) -> str:
        return self.api_key

    def get_log_level(self) -> str:
        return self.log_level

    def get_python_env(self) -> str:
        return self.python_env
