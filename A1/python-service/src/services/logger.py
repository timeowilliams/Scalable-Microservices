import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime


class Logger:
    def __init__(self, config):
        self.config = config
        self.correlation_id: Optional[str] = None
        self._setup_logging()

    def _setup_logging(self):
        log_level = self.config.get_log_level().upper()
        logging.basicConfig(
            level=getattr(logging, log_level, logging.INFO),
            format='%(message)s'
        )

    def set_correlation_id(self, correlation_id: str):
        self.correlation_id = correlation_id

    def _log(self, level: str, message: str, metadata: Optional[Dict[str, Any]] = None):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': level,
            'message': message,
            'service': 'python-sensor-service',
        }

        if self.correlation_id:
            log_entry['correlationId'] = self.correlation_id

        if metadata:
            log_entry.update(metadata)

        # Check if we should log based on configured level
        log_level = self.config.get_log_level().lower()
        levels = {'error': 0, 'warn': 1, 'info': 2, 'debug': 3}
        current_level = levels.get(level, 2)
        configured_level = levels.get(log_level, 2)

        if current_level <= configured_level:
            print(json.dumps(log_entry))

    def info(self, message: str, metadata: Optional[Dict[str, Any]] = None):
        self._log('info', message, metadata)

    def warn(self, message: str, metadata: Optional[Dict[str, Any]] = None):
        self._log('warn', message, metadata)

    def error(self, message: str, metadata: Optional[Dict[str, Any]] = None):
        self._log('error', message, metadata)

    def debug(self, message: str, metadata: Optional[Dict[str, Any]] = None):
        self._log('debug', message, metadata)
