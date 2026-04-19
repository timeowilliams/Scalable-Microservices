class CommandController {
  constructor(service, logger) {
    this.service = service;
    this.logger = logger;
  }

  async getAllDashboards(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const dashboards = await this.service.getAllDashboards();
      res.status(200).json({
        data: dashboards,
        count: dashboards.length
      });
    } catch (error) {
      this.logger.error('Error fetching dashboards', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getDashboardById(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const { id } = req.params;
      const dashboard = await this.service.getDashboardById(id);
      res.status(200).json(dashboard);
    } catch (error) {
      if (error.message === 'Dashboard not found') {
        res.status(404).json({ error: 'Dashboard not found' });
      } else {
        this.logger.error('Error fetching dashboard', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async createDashboard(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const dashboardData = req.body;
      const dashboard = await this.service.createDashboard(dashboardData);
      res.status(201).json(dashboard);
    } catch (error) {
      this.logger.error('Error creating dashboard', { error: error.message });
      res.status(400).json({ error: error.message });
    }
  }

  async getAllAlerts(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const filters = {
        acknowledged: req.query.acknowledged !== undefined ? req.query.acknowledged === 'true' : undefined,
        severity: req.query.severity,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined
      };

      const alerts = await this.service.getAllAlerts(filters);
      res.status(200).json({
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      this.logger.error('Error fetching alerts', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createAlert(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const alertData = req.body;
      const alert = await this.service.createAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        this.logger.error('Error creating alert', { error: error.message });
        res.status(400).json({ error: error.message });
      }
    }
  }

  async acknowledgeAlert(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const { id } = req.params;
      const alert = await this.service.acknowledgeAlert(id);
      res.status(200).json(alert);
    } catch (error) {
      if (error.message === 'Alert not found') {
        res.status(404).json({ error: 'Alert not found' });
      } else {
        this.logger.error('Error acknowledging alert', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Async endpoint: Aggregate sensors in parallel
  async aggregateSensors(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const sensorIds = req.body.sensor_ids || [];
      if (sensorIds.length === 0) {
        return res.status(400).json({ error: 'sensor_ids array is required' });
      }

      const summary = await this.service.aggregateSensors(sensorIds);
      res.status(200).json(summary);
    } catch (error) {
      this.logger.error('Error aggregating sensors', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Async endpoint: Create mission plan
  async createMissionPlan(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const missionData = req.body;
      const dashboard = await this.service.createMissionPlan(missionData);
      res.status(201).json(dashboard);
    } catch (error) {
      this.logger.error('Error creating mission plan', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Async endpoint: Threat assessment
  async assessThreats(req, res) {
    try {
      const correlationId = req.correlationId || req.headers['x-correlation-id'];
      this.logger.setCorrelationId(correlationId);

      const sensorIds = req.body.sensor_ids || [];
      if (sensorIds.length === 0) {
        return res.status(400).json({ error: 'sensor_ids array is required' });
      }

      const assessment = await this.service.assessThreats(sensorIds);
      res.status(200).json(assessment);
    } catch (error) {
      this.logger.error('Error assessing threats', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = CommandController;
