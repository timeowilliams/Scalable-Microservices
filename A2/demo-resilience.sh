#!/bin/bash

# Resilience Patterns Demonstration Script
# This script demonstrates circuit breakers, timeouts, and rate limiting

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "Resilience Patterns Demonstration"
echo "=========================================="
echo ""

# Check if services are running
if ! docker compose ps | grep -q "Up"; then
    echo -e "${RED}Error: Services are not running. Start them with: docker compose up -d${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Testing Circuit Breaker Pattern${NC}"
echo "Stopping Node.js Sensor Service to simulate failure..."
docker compose stop node-sensor-service > /dev/null 2>&1
sleep 2

echo "Making 6 requests to Command Service (should trigger circuit breaker)..."
for i in {1..6}; do
    response=$(curl -s -X POST http://localhost:3001/sensor-aggregate \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer default-api-key-change-me" \
        -d '{"sensor_ids":["test_sensor"]}' 2>&1)
    
    if echo "$response" | grep -q "Circuit breaker is OPEN"; then
        echo -e "  Request $i: ${RED}Circuit Breaker OPEN${NC} (as expected)"
    elif echo "$response" | grep -q "error\|Error\|failed"; then
        echo -e "  Request $i: ${YELLOW}Failed${NC} (building up to circuit open)"
    else
        echo -e "  Request $i: ${GREEN}Success${NC}"
    fi
    sleep 0.5
done

echo "Restarting Node.js Sensor Service..."
docker compose start node-sensor-service > /dev/null 2>&1
sleep 5
echo ""

echo -e "${YELLOW}2. Testing Rate Limiting Pattern${NC}"
echo "Making 150 rapid requests to /dashboards endpoint..."
rate_limited=0
success=0
for i in {1..150}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/dashboards)
    if [ "$status" = "429" ]; then
        rate_limited=$((rate_limited + 1))
    elif [ "$status" = "200" ]; then
        success=$((success + 1))
    fi
    # Small delay to avoid overwhelming
    if [ $((i % 50)) -eq 0 ]; then
        echo "  Progress: $i/150 requests..."
    fi
done
echo -e "  Results: ${GREEN}$success successful${NC}, ${RED}$rate_limited rate-limited${NC}"
echo ""

echo -e "${YELLOW}3. Testing Timeout Pattern${NC}"
echo "Stopping Python Sensor Service to simulate timeout..."
docker compose stop python-sensor-service > /dev/null 2>&1
sleep 2

echo "Making request with 10 second timeout..."
start_time=$(date +%s)
timeout 10 curl -s http://localhost:8000/health > /dev/null 2>&1
end_time=$(date +%s)
elapsed=$((end_time - start_time))

if [ $elapsed -ge 5 ]; then
    echo -e "  ${YELLOW}Request timed out after ~${elapsed} seconds${NC} (as expected)"
else
    echo -e "  ${GREEN}Request completed in ${elapsed} seconds${NC}"
fi

echo "Restarting Python Sensor Service..."
docker compose start python-sensor-service > /dev/null 2>&1
sleep 5
echo ""

echo -e "${YELLOW}4. Viewing Resilience Event Logs${NC}"
echo "Circuit Breaker Events:"
docker compose logs node-command-service 2>&1 | grep -i "circuit\|breaker" | tail -5 || echo "  No circuit breaker events in recent logs"

echo ""
echo "Rate Limiting Events:"
docker compose logs node-command-service 2>&1 | grep -i "rate\|429" | tail -5 || echo "  No rate limiting events in recent logs"

echo ""
echo "Timeout Events:"
docker compose logs node-command-service 2>&1 | grep -i "timeout\|ETIMEDOUT" | tail -5 || echo "  No timeout events in recent logs"

echo ""
echo "=========================================="
echo -e "${GREEN}Demonstration Complete!${NC}"
echo "=========================================="
echo ""
echo "To view detailed logs:"
echo "  docker compose logs node-command-service | grep -i 'circuit\|timeout\|rate'"
echo ""
echo "To capture logs to file:"
echo "  docker compose logs > resilience-logs.txt"
