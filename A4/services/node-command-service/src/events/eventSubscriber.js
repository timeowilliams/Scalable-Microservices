const amqp = require('amqplib');
const Config = require('../config/config');

// Bulkhead: Separate connection for event bus subscriptions
class EventSubscriber {
  constructor(dashboardRepository, alertRepository, logger) {
    this.dashboardRepository = dashboardRepository;
    this.alertRepository = alertRepository;
    this.logger = logger;
    this.queues = [];
  }

  async start() {
    try {
      const config = new Config();
      const url = config.getRabbitmqUrl();
      const connection = await amqp.connect(url);
      const channel = await connection.createChannel();
      
      // Keep connection alive
      this.connection = connection;
      this.channel = channel;

      // Declare exchanges
      await channel.assertExchange('sensor.events', 'topic', { durable: true });

      // Create queues
      const sensorQueue = await channel.assertQueue('command.sensor.events', { durable: true });
      await channel.bindQueue(sensorQueue.queue, 'sensor.events', 'sensor.*');

      // Consume sensor events
      await channel.consume(sensorQueue.queue, async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            await this.handleSensorEvent(event);
            channel.ack(msg);
          } catch (error) {
            this.logger.error('Error processing sensor event', { error: error.message });
            channel.nack(msg, false, false); // Don't requeue on error
          }
        }
      }, { noAck: false });

      this.queues.push(sensorQueue.queue);
      this.logger.info('Event subscriber started', { queues: this.queues });
    } catch (error) {
      this.logger.error('Failed to start event subscriber', { error: error.message });
    }
  }

  async handleSensorEvent(event) {
    this.logger.info('Received sensor event', { event_type: event.event_type });

    if (event.event_type === 'sensor.created' || event.event_type === 'sensor.updated') {
      // Update dashboards with new sensor data
      const dashboards = await this.dashboardRepository.findAll();
      for (const dashboard of dashboards) {
        if (dashboard.status === 'active') {
          const summary = dashboard.sensor_summary || {};
          summary[event.data.sensor_id] = event.data;
          await this.dashboardRepository.update(dashboard.dashboard_id, {
            sensor_summary: summary
          });
        }
      }
    } else if (event.event_type === 'sensor.alert') {
      // Create alert from sensor alert event
      const alert = {
        alert_id: `alert_${event.event_id}`,
        sensor_id: event.data.sensor_id,
        alert_type: 'sensor_alert',
        severity: 'high',
        message: event.data.alert_message || `Alert from sensor ${event.data.sensor_id}`
      };
      await this.alertRepository.create(alert);
    }
  }
}

module.exports = EventSubscriber;
