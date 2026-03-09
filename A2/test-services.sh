#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_KEY="${API_KEY:-default-api-key-change-me}"
PASSED=0
FAILED=0

echo "=========================================="
echo "Assignment 2 Service Communication Tests"
echo "=========================================="
echo ""

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local headers=$4
    local data=$5
    local expected_status=$6
    
    echo -n "Testing $name... "
    
    if [ -n "$data" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "$headers" \
                -H "Content-Type: application/json" \
                -d "$data" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -d "$data" 2>/dev/null)
        fi
    else
        if [ -n "$headers" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
                -H "$headers" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>/dev/null)
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $http_code)"
        echo "  Response: $body"
        ((FAILED++))
        return 1
    fi
}

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

echo ""
echo "=========================================="
echo "1. Health Checks & Database Connectivity"
echo "=========================================="
echo ""

test_endpoint "Node.js Sensor Service Health" "GET" "http://localhost:3000/health" "" "" "200"
test_endpoint "Python Sensor Service Health" "GET" "http://localhost:8000/health" "" "" "200"
test_endpoint "Node.js Command Service Health" "GET" "http://localhost:3001/health" "" "" "200"
test_endpoint "Python Command Service Health" "GET" "http://localhost:8001/health" "" "" "200"

echo ""
echo "=========================================="
echo "2. Database Per Service Pattern"
echo "=========================================="
echo ""

# Check that health endpoints show database connectivity
echo -n "Verifying database connectivity in health checks... "
node_health=$(curl -s http://localhost:3000/health)
if echo "$node_health" | grep -q "database"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARN${NC} (Database status not shown in health check)"
fi

echo ""
echo "=========================================="
echo "3. Sensor Service Operations"
echo "=========================================="
echo ""

# Create a sensor via Node.js service
test_endpoint "Create Sensor (Node.js)" "POST" "http://localhost:3000/sensors" \
    "Authorization: Bearer $API_KEY" \
    '{"sensor_id":"test_temp_node","type":"temperature","value":72.5,"unit":"F"}' \
    "201"

# Create a sensor via Python service
test_endpoint "Create Sensor (Python)" "POST" "http://localhost:8000/sensors" \
    "Authorization: Bearer $API_KEY" \
    '{"sensor_id":"test_temp_python","type":"temperature","value":68.0,"unit":"F"}' \
    "201"

# Get all sensors
test_endpoint "Get All Sensors (Node.js)" "GET" "http://localhost:3000/sensors" "" "" "200"
test_endpoint "Get All Sensors (Python)" "GET" "http://localhost:8000/sensors" "" "" "200"

# Get sensor by ID
test_endpoint "Get Sensor by ID (Node.js)" "GET" "http://localhost:3000/sensors/test_temp_node" "" "" "200"
test_endpoint "Get Sensor by ID (Python)" "GET" "http://localhost:8000/sensors/test_temp_python" "" "" "200"

echo ""
echo "=========================================="
echo "4. Inter-Service Communication (HTTP)"
echo "=========================================="
echo ""

# Test Command service calling Sensor service (synchronous HTTP)
echo -n "Testing Command → Sensor HTTP communication... "
command_response=$(curl -s -X POST "http://localhost:3001/sensor-aggregate" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"sensor_ids":["test_temp_node"]}' 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$command_response" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

echo ""
echo "=========================================="
echo "5. Command & Control Service Operations"
echo "=========================================="
echo ""

# Get dashboards
test_endpoint "Get Dashboards (Node.js)" "GET" "http://localhost:3001/dashboards" "" "" "200"
test_endpoint "Get Dashboards (Python)" "GET" "http://localhost:8001/dashboards" "" "" "200"

# Create dashboard
test_endpoint "Create Dashboard (Node.js)" "POST" "http://localhost:3001/dashboards" \
    "Authorization: Bearer $API_KEY" \
    '{"dashboard_id":"test_dashboard","name":"Test Dashboard","mission_id":"test_mission"}' \
    "201"

# Create alert
test_endpoint "Create Alert (Node.js)" "POST" "http://localhost:3001/alerts" \
    "Authorization: Bearer $API_KEY" \
    '{"alert_id":"test_alert","sensor_id":"test_temp_node","severity":"medium","message":"Test alert"}' \
    "201"

echo ""
echo "=========================================="
echo "6. RabbitMQ Event Communication"
echo "=========================================="
echo ""

# Check RabbitMQ management UI is accessible
echo -n "Checking RabbitMQ Management UI... "
rabbitmq_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:15672 2>/dev/null)
if [ "$rabbitmq_status" == "200" ] || [ "$rabbitmq_status" == "401" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Management UI accessible)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Management UI not accessible)"
    ((FAILED++))
fi

# Note: Event publishing/subscribing is harder to test via curl
# We verify the services are running and can connect to RabbitMQ
echo -n "Verifying RabbitMQ connectivity (check service logs)... "
echo -e "${YELLOW}⚠ MANUAL${NC} (Check docker logs for RabbitMQ connection messages)"

echo ""
echo "=========================================="
echo "7. Authentication & Security"
echo "=========================================="
echo ""

# Test unauthorized access
test_endpoint "Unauthorized Sensor Creation" "POST" "http://localhost:3000/sensors" \
    "" \
    '{"sensor_id":"unauthorized","type":"temperature","value":70,"unit":"F"}' \
    "401"

test_endpoint "Invalid API Key" "POST" "http://localhost:3000/sensors" \
    "Authorization: Bearer invalid-key" \
    '{"sensor_id":"invalid","type":"temperature","value":70,"unit":"F"}' \
    "401"

echo ""
echo "=========================================="
echo "8. Data Persistence (Database)"
echo "=========================================="
echo ""

# Create a sensor, then verify it persists
echo -n "Testing data persistence... "
create_response=$(curl -s -X POST "http://localhost:3000/sensors" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"sensor_id":"persist_test","type":"humidity","value":50,"unit":"%"}' 2>/dev/null)

if [ $? -eq 0 ]; then
    # Wait a moment
    sleep 1
    # Try to retrieve it
    get_response=$(curl -s "http://localhost:3000/sensors/persist_test" 2>/dev/null)
    if echo "$get_response" | grep -q "persist_test"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Data not persisted)"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ FAIL${NC} (Could not create sensor)"
    ((FAILED++))
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi
