const express = require('express');
const router = express.Router();

function createSensorRoutes(controller, authMiddleware, validateSensorCreate) {
  // GET /sensors - List all sensors
  router.get('/', (req, res) => controller.getAllSensors(req, res));

  // GET /sensors/:id - Get sensor by ID
  router.get('/:id', (req, res) => controller.getSensorById(req, res));

  // POST /sensors - Create new sensor (requires authentication)
  router.post('/', authMiddleware, validateSensorCreate, (req, res) => controller.createSensor(req, res));

  return router;
}

module.exports = createSensorRoutes;
