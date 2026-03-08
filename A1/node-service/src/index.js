const createApp = require('./app');
const Config = require('./config/config');

const config = new Config();
const app = createApp();

const PORT = config.getPort();

app.listen(PORT, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Node service running on port ${PORT}`,
    service: 'node-sensor-service',
    port: PORT
  }));
});
