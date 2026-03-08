import pika
import json
from config.config import Config
from typing import Dict, Any

# Bulkhead: Separate connection for event bus
_connection = None
_channel = None


def get_connection():
    """Get or create RabbitMQ connection (Bulkhead pattern)"""
    global _connection
    if _connection is None or _connection.is_closed:
        config = Config()
        url = config.get_rabbitmq_url()
        
        # Parse URL
        from urllib.parse import urlparse
        parsed = urlparse(url)
        
        credentials = pika.PlainCredentials(parsed.username or 'admin', parsed.password or 'admin')
        parameters = pika.ConnectionParameters(
            host=parsed.hostname or 'localhost',
            port=parsed.port or 5672,
            virtual_host=parsed.path[1:] if parsed.path else '/',
            credentials=credentials
        )
        
        _connection = pika.BlockingConnection(parameters)
        print('RabbitMQ connection established')
    return _connection


def get_channel():
    """Get or create RabbitMQ channel"""
    global _channel
    if _channel is None or _channel.is_closed:
        conn = get_connection()
        _channel = conn.channel()
        
        # Declare exchanges
        _channel.exchange_declare(exchange='sensor.events', exchange_type='topic', durable=True)
        _channel.exchange_declare(exchange='command.events', exchange_type='topic', durable=True)
        
        print('RabbitMQ channel established')
    return _channel


def publish_event(exchange: str, routing_key: str, event: Dict[str, Any]) -> bool:
    """Publish event to RabbitMQ"""
    try:
        ch = get_channel()
        message = json.dumps(event)
        ch.basic_publish(
            exchange=exchange,
            routing_key=routing_key,
            body=message,
            properties=pika.BasicProperties(delivery_mode=2)  # Make message persistent
        )
        return True
    except Exception as error:
        print(f'Failed to publish event: {error}')
        return False


def close_connection():
    """Close RabbitMQ connection"""
    global _channel, _connection
    if _channel and not _channel.is_closed:
        _channel.close()
        _channel = None
    if _connection and not _connection.is_closed:
        _connection.close()
        _connection = None
