import pika
import json
from typing import Dict, Any
from config.config import Config
from events.rabbitmq_client import get_connection, get_channel


class EventSubscriber:
    def __init__(self, dashboard_repository, alert_repository, logger):
        self.dashboard_repository = dashboard_repository
        self.alert_repository = alert_repository
        self.logger = logger
        self.queues = []

    def start(self):
        """Start consuming events from RabbitMQ"""
        try:
            channel = get_channel()

            # Create queue
            queue_result = channel.queue_declare(queue='command.sensor.events', durable=True)
            queue_name = queue_result.method.queue

            # Bind to sensor events
            channel.queue_bind(
                exchange='sensor.events',
                queue=queue_name,
                routing_key='sensor.*'
            )

            # Set up consumer
            channel.basic_consume(
                queue=queue_name,
                on_message_callback=self._handle_message,
                auto_ack=False
            )

            self.queues.append(queue_name)
            self.logger.info('Event subscriber started', {'queues': self.queues})

            # Start consuming (blocking)
            channel.start_consuming()
        except Exception as error:
            self.logger.error('Failed to start event subscriber', {'error': str(error)})

    def _handle_message(self, ch, method, properties, body):
        """Handle incoming message"""
        try:
            event = json.loads(body)
            import asyncio
            asyncio.run(self.handle_sensor_event(event))
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as error:
            self.logger.error('Error processing sensor event', {'error': str(error)})
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    async def handle_sensor_event(self, event: Dict[str, Any]):
        """Process sensor event"""
        self.logger.info('Received sensor event', {'event_type': event.get('event_type')})

        event_type = event.get('event_type')
        if event_type in ['sensor.created', 'sensor.updated']:
            # Update dashboards with new sensor data
            dashboards = await self.dashboard_repository.find_all()
            for dashboard in dashboards:
                if dashboard['status'] == 'active':
                    summary = dashboard.get('sensor_summary', {})
                    summary[event['data']['sensor_id']] = event['data']
                    await self.dashboard_repository.update(dashboard['dashboard_id'], {
                        'sensor_summary': summary
                    })
        elif event_type == 'sensor.alert':
            # Create alert from sensor alert event
            alert = {
                'alert_id': f"alert_{event['event_id']}",
                'sensor_id': event['data']['sensor_id'],
                'alert_type': 'sensor_alert',
                'severity': 'high',
                'message': event['data'].get('alert_message', f"Alert from sensor {event['data']['sensor_id']}")
            }
            await self.alert_repository.create(alert)
