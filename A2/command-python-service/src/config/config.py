import os


class Config:
    def __init__(self):
        self.port = int(os.getenv('PORT', '8001'))
        self.api_key = os.getenv('API_KEY', 'default-api-key-change-me')
        self.log_level = os.getenv('LOG_LEVEL', 'info')
        self.python_env = os.getenv('PYTHON_ENV', 'development')
        
        # Database configuration
        self.db_host = os.getenv('DB_HOST', 'localhost')
        self.db_port = int(os.getenv('DB_PORT', '5432'))
        self.db_name = os.getenv('DB_NAME', 'python_command_db')
        self.db_user = os.getenv('DB_USER', 'command_user')
        self.db_password = os.getenv('DB_PASSWORD', 'command_pass')
        
        # Sensor service URL
        self.sensor_service_url = os.getenv('SENSOR_SERVICE_URL', 'http://localhost:8000')
        
        # RabbitMQ configuration
        self.rabbitmq_url = os.getenv('RABBITMQ_URL', 'amqp://admin:admin@localhost:5672')
        
        # Worker configuration
        self.workers = int(os.getenv('WORKERS', '2'))

    def get_port(self):
        return self.port

    def get_api_key(self):
        return self.api_key

    def get_log_level(self):
        return self.log_level

    def get_db_config(self):
        return {
            'host': self.db_host,
            'port': self.db_port,
            'database': self.db_name,
            'user': self.db_user,
            'password': self.db_password,
            'min_size': 2,
            'max_size': 10,
        }

    def get_sensor_service_url(self):
        return self.sensor_service_url

    def get_rabbitmq_url(self):
        return self.rabbitmq_url

    def get_workers(self):
        return self.workers
