const amqp = require('amqplib');
const Config = require('../config/config');

// Bulkhead: Separate connection pool for event bus
let connection = null;
let channel = null;

async function getConnection() {
  if (!connection) {
    const config = new Config();
    const url = config.getRabbitmqUrl();
    
    try {
      connection = await amqp.connect(url);
      connection.on('error', (err) => {
        console.error('RabbitMQ connection error', err);
        connection = null;
        channel = null;
      });
      console.log('RabbitMQ connection established');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ', error);
      throw error;
    }
  }
  return connection;
}

async function getChannel() {
  if (!channel) {
    const conn = await getConnection();
    channel = await conn.createChannel();
    
    // Declare exchanges
    await channel.assertExchange('sensor.events', 'topic', { durable: true });
    await channel.assertExchange('command.events', 'topic', { durable: true });
    
    console.log('RabbitMQ channel established');
  }
  return channel;
}

async function publishEvent(exchange, routingKey, event) {
  try {
    const ch = await getChannel();
    const message = JSON.stringify(event);
    ch.publish(exchange, routingKey, Buffer.from(message), { persistent: true });
    return true;
  } catch (error) {
    console.error('Failed to publish event', error);
    return false;
  }
}

async function closeConnection() {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
}

module.exports = {
  getConnection,
  getChannel,
  publishEvent,
  closeConnection
};
