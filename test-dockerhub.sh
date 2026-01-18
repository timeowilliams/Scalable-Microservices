#!/bin/bash

echo "=========================================="
echo "Testing Docker Hub Images"
echo "=========================================="
echo ""

# Stop any existing containers
echo "Cleaning up existing containers..."
docker stop node-sensor-service python-sensor-service 2>/dev/null || true
docker rm node-sensor-service python-sensor-service 2>/dev/null || true

# Pull images
echo ""
echo "Pulling images from Docker Hub..."
docker pull timwillie73/node-sensor-service:latest
docker pull timwillie73/python-sensor-service:latest

# Start containers
echo ""
echo "Starting containers..."
docker run -d -p 3000:3000 --name node-sensor-service timwillie73/node-sensor-service:latest
docker run -d -p 8000:8000 --name python-sensor-service timwillie73/python-sensor-service:latest

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
echo "Sensor Data:"
curl -s http://localhost:3000/sensors | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/sensors
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
echo "Sensor Data:"
curl -s http://localhost:8000/sensors | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8000/sensors
echo ""

echo ""
echo "=========================================="
echo "Test Complete!"
echo "=========================================="
echo ""
echo "To stop the containers, run:"
echo "  docker stop node-sensor-service python-sensor-service"
echo "  docker rm node-sensor-service python-sensor-service"
