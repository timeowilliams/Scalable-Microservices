const { v4: uuidv4 } = require('uuid');

class CommandService {
  constructor(dashboardRepository, alertRepository, sensorClient, logger) {
    this.dashboardRepository = dashboardRepository;
    this.alertRepository = alertRepository;
    this.sensorClient = sensorClient;
    this.logger = logger;
  }

  async getAllDashboards() {
    this.logger.info('Fetching all dashboards');
    return await this.dashboardRepository.findAll();
  }

  async getDashboardById(id) {
    this.logger.info('Fetching dashboard', { dashboard_id: id });
    const dashboard = await this.dashboardRepository.findById(id);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }
    return dashboard;
  }

  async createDashboard(dashboardData) {
    const dashboardId = dashboardData.dashboard_id || `dashboard_${uuidv4()}`;
    this.logger.info('Creating dashboard', { dashboard_id: dashboardId });

    const dashboard = {
      dashboard_id: dashboardId,
      mission_id: dashboardData.mission_id || null,
      sensor_summary: dashboardData.sensor_summary || {},
      threat_level: dashboardData.threat_level || 'low',
      status: dashboardData.status || 'active'
    };

    return await this.dashboardRepository.create(dashboard);
  }

  // Synchronous: Fetch single sensor for validation
  async createAlert(alertData) {
    const alertId = alertData.alert_id || `alert_${uuidv4()}`;
    this.logger.info('Creating alert', { alert_id: alertId });

    // Sync call to validate sensor exists
    try {
      await this.sensorClient.getSensorSync(alertData.sensor_id, this.logger.getCorrelationId());
    } catch (error) {
      throw new Error(`Sensor ${alertData.sensor_id} not found`);
    }

    const alert = {
      alert_id: alertId,
      sensor_id: alertData.sensor_id,
      alert_type: alertData.alert_type || 'general',
      severity: alertData.severity || 'medium',
      message: alertData.message || 'Alert triggered'
    };

    return await this.alertRepository.create(alert);
  }

  async getAllAlerts(filters = {}) {
    this.logger.info('Fetching all alerts', { filters });
    return await this.alertRepository.findAll(filters);
  }

  async acknowledgeAlert(alertId) {
    this.logger.info('Acknowledging alert', { alert_id: alertId });
    const alert = await this.alertRepository.acknowledge(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }
    return alert;
  }

  // Asynchronous: Aggregate multiple sensors in parallel
  async aggregateSensors(sensorIds) {
    this.logger.info('Aggregating sensors', { sensor_ids: sensorIds });
    
    // Async parallel calls
    const sensors = await this.sensorClient.getSensorsAsync(sensorIds, this.logger.getCorrelationId());
    
    const summary = {
      total: sensors.length,
      by_type: {},
      values: [],
      timestamp: new Date().toISOString()
    };

    sensors.forEach(sensor => {
      if (!sensor.error) {
        summary.by_type[sensor.type] = (summary.by_type[sensor.type] || 0) + 1;
        summary.values.push({
          sensor_id: sensor.sensor_id,
          type: sensor.type,
          value: sensor.value,
          unit: sensor.unit
        });
      }
    });

    return summary;
  }

  // Asynchronous: Mission planning with parallel sensor fetches
  async createMissionPlan(missionData) {
    const missionId = missionData.mission_id || `mission_${uuidv4()}`;
    this.logger.info('Creating mission plan', { mission_id: missionId });

    // Fetch all sensors asynchronously
    const allSensors = await this.sensorClient.getAllSensors({}, this.logger.getCorrelationId());
    const sensors = allSensors.data || [];

    // Analyze sensor data for threat assessment
    const threatLevel = this._assessThreatLevel(sensors);
    const sensorSummary = {
      total_sensors: sensors.length,
      sensor_types: this._groupByType(sensors),
      critical_sensors: sensors.filter(s => 
        (s.type === 'motion' && s.value === 1) ||
        (s.type === 'temperature' && (s.value > 100 || s.value < 32))
      )
    };

    const dashboard = {
      dashboard_id: `dashboard_${missionId}`,
      mission_id: missionId,
      sensor_summary: sensorSummary,
      threat_level: threatLevel,
      status: 'active'
    };

    return await this.dashboardRepository.create(dashboard);
  }

  // Asynchronous: Threat assessment with parallel sensor fetches
  async assessThreats(sensorIds) {
    this.logger.info('Assessing threats', { sensor_ids: sensorIds });

    // Async parallel calls to fetch multiple sensors
    const sensors = await this.sensorClient.getSensorsAsync(sensorIds, this.logger.getCorrelationId());
    
    const threats = [];
    sensors.forEach(sensor => {
      if (!sensor.error) {
        if (sensor.type === 'motion' && sensor.value === 1) {
          threats.push({
            sensor_id: sensor.sensor_id,
            type: 'motion_detected',
            severity: 'high',
            message: `Motion detected at ${sensor.sensor_id}`
          });
        } else if (sensor.type === 'temperature' && sensor.value > 100) {
          threats.push({
            sensor_id: sensor.sensor_id,
            type: 'temperature_high',
            severity: 'critical',
            message: `High temperature detected: ${sensor.value}${sensor.unit}`
          });
        }
      }
    });

    return {
      threat_level: threats.length > 0 ? 'high' : 'low',
      threats: threats,
      assessed_at: new Date().toISOString()
    };
  }

  _assessThreatLevel(sensors) {
    const hasMotion = sensors.some(s => s.type === 'motion' && s.value === 1);
    const hasHighTemp = sensors.some(s => s.type === 'temperature' && s.value > 100);
    
    if (hasMotion && hasHighTemp) return 'critical';
    if (hasMotion || hasHighTemp) return 'high';
    return 'low';
  }

  _groupByType(sensors) {
    const grouped = {};
    sensors.forEach(sensor => {
      grouped[sensor.type] = (grouped[sensor.type] || 0) + 1;
    });
    return grouped;
  }
}

module.exports = CommandService;
