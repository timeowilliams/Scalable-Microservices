const express = require('express');

function createCommandRoutes(controller, authMiddleware, rateLimiter) {
  const router = express.Router();

  // Apply rate limiting to all routes
  router.use(rateLimiter);

  // Sync endpoints
  router.get('/dashboards', controller.getAllDashboards.bind(controller));
  router.get('/dashboards/:id', controller.getDashboardById.bind(controller));
  router.post('/dashboards', authMiddleware, controller.createDashboard.bind(controller));
  
  router.get('/alerts', controller.getAllAlerts.bind(controller));
  router.post('/alerts', authMiddleware, controller.createAlert.bind(controller));
  router.patch('/alerts/:id/acknowledge', authMiddleware, controller.acknowledgeAlert.bind(controller));

  // Async endpoints
  router.post('/sensor-aggregate', authMiddleware, controller.aggregateSensors.bind(controller));
  router.post('/mission-plan', authMiddleware, controller.createMissionPlan.bind(controller));
  router.post('/threat-assessment', authMiddleware, controller.assessThreats.bind(controller));

  return router;
}

module.exports = createCommandRoutes;
