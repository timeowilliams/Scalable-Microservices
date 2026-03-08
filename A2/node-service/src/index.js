const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const createApp = require('./app');
const Config = require('./config/config');

const config = new Config();
const numWorkers = config.getWorkers() || numCPUs;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  console.log(`Starting ${numWorkers} workers...`);

  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker');
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  const app = createApp();
  const PORT = config.getPort();

  app.listen(PORT, () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Node service worker ${process.pid} running on port ${PORT}`,
      service: 'node-sensor-service',
      port: PORT,
      worker: process.pid
    }));
  });
}
