import os


class Config:
    def __init__(self):
        self.port = int(os.getenv('PORT', '8000'))
        self.api_key = os.getenv('API_KEY', 'default-api-key-change-me')
        self.log_level = os.getenv('LOG_LEVEL', 'info')
        self.python_env = os.getenv('PYTHON_ENV', 'development')
        
        # Database configuration
        self.db_host = os.getenv('DB_HOST', 'localhost')
        self.db_port = int(os.getenv('DB_PORT', '5432'))
        self.db_name = os.getenv('DB_NAME', 'python_sensor_db')
        self.db_user = os.getenv('DB_USER', 'sensor_user')
        self.db_password = os.getenv('DB_PASSWORD', 'sensor_pass')
        
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
            'min_size': 2,  # Bulkhead: minimum pool size
            'max_size': 10,  # Bulkhead: maximum pool size
        }

    def get_rabbitmq_url(self):
        return self.rabbitmq_url

    def get_workers(self):
        return self.workers
