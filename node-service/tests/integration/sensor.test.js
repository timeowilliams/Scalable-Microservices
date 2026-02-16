const request = require('supertest');
const createApp = require('../../src/app');

describe('Sensor API Integration Tests', () => {
  let app;
  let apiKey;

  beforeAll(() => {
    // Set test API key
    process.env.API_KEY = 'test-api-key-123';
    apiKey = process.env.API_KEY;
    app = createApp();
  });

  afterAll(() => {
    delete process.env.API_KEY;
  });

  describe('POST /sensors - Create sensor', () => {
    it('should create a new sensor with valid API key', async () => {
      const newSensor = {
        sensor_id: 'test_temp_sensor',
        type: 'temperature',
        value: 75.5,
        unit: 'F'
      };

      const response = await request(app)
        .post('/sensors')
        .set('Authorization', `Bearer ${apiKey}`)
        .send(newSensor)
        .expect(201);

      expect(response.body).toHaveProperty('sensor_id', 'test_temp_sensor');
      expect(response.body).toHaveProperty('type', 'temperature');
      expect(response.body).toHaveProperty('value', 75.5);
      expect(response.body).toHaveProperty('unit', 'F');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should return 401 without API key', async () => {
      const newSensor = {
        sensor_id: 'test_sensor_no_auth',
        type: 'humidity',
        value: 50,
        unit: '%'
      };

      const response = await request(app)
        .post('/sensors')
        .send(newSensor)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('API key');
    });

    it('should return 401 with invalid API key', async () => {
      const newSensor = {
        sensor_id: 'test_sensor_invalid_key',
        type: 'motion',
        value: 1,
        unit: 'boolean'
      };

      const response = await request(app)
        .post('/sensors')
        .set('Authorization', 'Bearer invalid-key')
        .send(newSensor)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 with missing required fields', async () => {
      const incompleteSensor = {
        type: 'temperature',
        value: 70
        // missing sensor_id and unit
      };

      const response = await request(app)
        .post('/sensors')
        .set('Authorization', `Bearer ${apiKey}`)
        .send(incompleteSensor)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 409 if sensor already exists', async () => {
      const sensor = {
        sensor_id: 'duplicate_sensor',
        type: 'temperature',
        value: 70,
        unit: 'F'
      };

      // Create first time
      await request(app)
        .post('/sensors')
        .set('Authorization', `Bearer ${apiKey}`)
        .send(sensor)
        .expect(201);

      // Try to create again
      const response = await request(app)
        .post('/sensors')
        .set('Authorization', `Bearer ${apiKey}`)
        .send(sensor)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Sensor already exists');
    });
  });

  describe('GET /sensors/:id - Get sensor by ID', () => {
    it('should fetch created sensor by ID', async () => {
      // First create a sensor
      const newSensor = {
        sensor_id: 'fetch_test_sensor',
        type: 'pressure',
        value: 14.7,
        unit: 'psi'
      };

      const createResponse = await request(app)
        .post('/sensors')
        .set('Authorization', `Bearer ${apiKey}`)
        .send(newSensor)
        .expect(201);

      const createdSensor = createResponse.body;

      // Then fetch it by ID
      const fetchResponse = await request(app)
        .get(`/sensors/${createdSensor.sensor_id}`)
        .expect(200);

      // Verify data integrity
      expect(fetchResponse.body.sensor_id).toBe(createdSensor.sensor_id);
      expect(fetchResponse.body.type).toBe(createdSensor.type);
      expect(fetchResponse.body.value).toBe(createdSensor.value);
      expect(fetchResponse.body.unit).toBe(createdSensor.unit);
      expect(fetchResponse.body.timestamp).toBe(createdSensor.timestamp);
      expect(fetchResponse.headers['x-correlation-id']).toBeDefined();
    });

    it('should return 404 for non-existent sensor', async () => {
      const response = await request(app)
        .get('/sensors/non_existent_sensor_12345')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Sensor not found');
    });
  });

  describe('GET /sensors - List all sensors', () => {
    it('should return all sensors', async () => {
      const response = await request(app)
        .get('/sensors')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should filter sensors by type', async () => {
      const response = await request(app)
        .get('/sensors?type=temperature')
        .expect(200);

      expect(response.body.data.every(s => s.type === 'temperature')).toBe(true);
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/sensors?limit=2&offset=0')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.count).toBeLessThanOrEqual(2);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity through create and fetch cycle', async () => {
      const originalSensor = {
        sensor_id: 'integrity_test_sensor',
        type: 'light',
        value: 500,
        unit: 'lux',
        timestamp: '2026-01-18T16:00:00Z'
      };

      // Create
      const createResponse = await request(app)
        .post('/sensors')
        .set('Authorization', `Bearer ${apiKey}`)
        .send(originalSensor)
        .expect(201);

      const created = createResponse.body;

      // Fetch
      const fetchResponse = await request(app)
        .get(`/sensors/${originalSensor.sensor_id}`)
        .expect(200);

      const fetched = fetchResponse.body;

      // Verify all fields match
      expect(fetched.sensor_id).toBe(originalSensor.sensor_id);
      expect(fetched.type).toBe(originalSensor.type);
      expect(fetched.value).toBe(originalSensor.value);
      expect(fetched.unit).toBe(originalSensor.unit);
      expect(fetched.timestamp).toBe(originalSensor.timestamp);
    });
  });
});
