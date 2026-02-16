#!/bin/bash

echo "=========================================="
echo "Testing Docker Hub Images (v2)"
echo "=========================================="
echo ""

# Stop any existing containers
echo "Cleaning up existing containers..."
docker stop node-sensor-service python-sensor-service 2>/dev/null || true
docker rm node-sensor-service python-sensor-service 2>/dev/null || true

# Pull images
echo ""
echo "Pulling images from Docker Hub..."
docker pull timwillie73/node-sensor-service:v2
docker pull timwillie73/python-sensor-service:v2

# Start containers
echo ""
echo "Starting containers..."
docker run -d -p 3000:3000 \
  -e API_KEY=test-api-key-123 \
  --name node-sensor-service \
  timwillie73/node-sensor-service:v2

docker run -d -p 8000:8000 \
  -e API_KEY=test-api-key-123 \
  --name python-sensor-service \
  timwillie73/python-sensor-service:v2

# Wait for services to be ready
echo ""
echo "Waiting for services to start..."
sleep 5

# Test Node.js service
echo ""
echo "=========================================="
echo "Testing Node.js Service (Port 3000)"
echo "=========================================="
echo ""
echo "Health Check:"
curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/health
echo ""
echo ""
echo "Get All Sensors:"
curl -s http://localhost:3000/sensors | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/sensors
echo ""
echo ""
echo "Create Sensor (with API key):"
curl -s -X POST http://localhost:3000/sensors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key-123" \
  -d '{"sensor_id":"test_sensor_v2","type":"temperature","value":72.5,"unit":"F"}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST http://localhost:3000/sensors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key-123" \
  -d '{"sensor_id":"test_sensor_v2","type":"temperature","value":72.5,"unit":"F"}'
echo ""

# Test Python service
echo ""
echo "=========================================="
echo "Testing Python Service (Port 8000)"
echo "=========================================="
echo ""
echo "Health Check:"
curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/health
echo ""
echo ""
echo "Get All Sensors:"
curl -s http://localhost:8000/sensors | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/sensors
echo ""
echo ""
echo "Create Sensor (with API key):"
curl -s -X POST http://localhost:8000/sensors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key-123" \
  -d '{"sensor_id":"test_sensor_v2_py","type":"humidity","value":55,"unit":"%"}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST http://localhost:8000/sensors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key-123" \
  -d '{"sensor_id":"test_sensor_v2_py","type":"humidity","value":55,"unit":"%"}'
echo ""

echo ""
echo "=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""
echo "To stop the containers, run:"
echo "  docker stop node-sensor-service python-sensor-service"
echo "  docker rm node-sensor-service python-sensor-service"
