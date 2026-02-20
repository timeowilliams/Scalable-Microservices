# How to Run Assignment 1

## Quick Start with Docker Compose (Recommended)

1. **Set environment variables** (optional, defaults provided):
   ```bash
   export API_KEY=your-secure-api-key-here
   export LOG_LEVEL=info
   ```

2. **Build and start services:**
   ```bash
   docker compose up --build
   ```

3. **Run in detached mode:**
   ```bash
   docker compose up -d --build
   ```

4. **View logs:**
   ```bash
   docker compose logs -f
   ```

5. **Stop services:**
   ```bash
   docker compose down
   ```

## Running Locally (Development)

### Node.js Service

1. **Install dependencies:**
   ```bash
   cd node-service
   npm install
   ```

2. **Set environment variables:**
   ```bash
   export PORT=3000
   export API_KEY=test-api-key-123
   export LOG_LEVEL=info
   ```

3. **Start service:**
   ```bash
   npm start
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

### Python Service

1. **Install dependencies:**
   ```bash
   cd python-service
   pip install -r requirements.txt
   ```

2. **Set environment variables:**
   ```bash
   export PORT=8000
   export API_KEY=test-api-key-123
   export LOG_LEVEL=info
   ```

3. **Start service:**
   ```bash
   cd src
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```

4. **Run tests:**
   ```bash
   pytest tests/
   ```

## Using Docker Hub Images

1. **Pull and run using docker-compose:**
   ```bash
   docker compose -f docker-compose.hub.yml up
   ```

2. **Or pull images individually:**
   ```bash
   docker pull timwillie73/node-sensor-service:v2
   docker pull timwillie73/python-sensor-service:v2
   ```

3. **Run containers:**
   ```bash
   docker run -d -p 3000:3000 \
     -e API_KEY=your-api-key \
     --name node-sensor-service \
     timwillie73/node-sensor-service:v2

   docker run -d -p 8000:8000 \
     -e API_KEY=your-api-key \
     --name python-sensor-service \
     timwillie73/python-sensor-service:v2
   ```

## Testing the Services

### Health Checks

```bash
# Node.js service
curl http://localhost:3000/health

# Python service
curl http://localhost:8000/health
```

### Create a Sensor (requires API key)

```bash
curl -X POST http://localhost:3000/sensors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer default-api-key-change-me" \
  -d '{
    "sensor_id": "test_sensor",
    "type": "temperature",
    "value": 72.5,
    "unit": "F"
  }'
```

### Get All Sensors

```bash
curl http://localhost:3000/sensors
```

### Get Sensor by ID

```bash
curl http://localhost:3000/sensors/test_sensor
```

### Filter Sensors by Type

```bash
curl "http://localhost:3000/sensors?type=temperature"
```

## Running Integration Tests

### Node.js Tests

```bash
cd node-service
npm test
```

### Python Tests

```bash
cd python-service
pytest tests/
```
