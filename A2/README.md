# Assignment 2: Database Per Service + Command & Control

## Project Overview

This assignment implements the **database per service** pattern with separate PostgreSQL databases for each microservice, adds a Command & Control service for tactical operations, integrates RabbitMQ for event-driven communication, and implements resilience patterns (bulkheads, circuit breakers, rate limiting).

## Architecture

### Services

1. **Node.js Sensor Service** (Port 3000) → `node_sensor_db`
2. **Python Sensor Service** (Port 8000) → `python_sensor_db`
3. **Node.js Command & Control Service** (Port 3001) → `node_command_db`
4. **Python Command & Control Service** (Port 8001) → `python_command_db`

### Infrastructure

- **4 PostgreSQL Databases**: One per service (database per service pattern)
- **RabbitMQ**: Event bus for asynchronous event-driven communication
- **Docker Resource Limits**: CPU and memory limits per service for isolation

## Architecture Diagrams

### 1. System Architecture Diagram

This diagram shows the overall system architecture with all services, databases, and communication patterns:

```mermaid
graph TB
    subgraph ClientLayer[Client Layer]
        Client[Client Application]
    end

    subgraph ServiceLayer[Service Layer]
        subgraph SensorServices[Sensor Services]
            NodeSensor[Node.js Sensor Service<br/>Port: 3000]
            PythonSensor[Python Sensor Service<br/>Port: 8000]
        end
        
        subgraph CommandServices[Command & Control Services]
            NodeCommand[Node.js Command Service<br/>Port: 3001]
            PythonCommand[Python Command Service<br/>Port: 8001]
        end
    end

    subgraph DataLayer[Data Layer - Database Per Service]
        NodeSensorDB[(node_sensor_db<br/>PostgreSQL)]
        PythonSensorDB[(python_sensor_db<br/>PostgreSQL)]
        NodeCommandDB[(node_command_db<br/>PostgreSQL)]
        PythonCommandDB[(python_command_db<br/>PostgreSQL)]
    end

    subgraph EventLayer[Event Bus]
        RabbitMQ[RabbitMQ<br/>Port: 5672<br/>Management: 15672]
    end

    Client -->|HTTP/REST| NodeSensor
    Client -->|HTTP/REST| PythonSensor
    Client -->|HTTP/REST| NodeCommand
    Client -->|HTTP/REST| PythonCommand

    NodeSensor -->|Read/Write| NodeSensorDB
    PythonSensor -->|Read/Write| PythonSensorDB
    NodeCommand -->|Read/Write| NodeCommandDB
    PythonCommand -->|Read/Write| PythonCommandDB

    NodeCommand -->|HTTP Sync| NodeSensor
    NodeCommand -->|HTTP Sync| PythonSensor
    PythonCommand -->|HTTP Sync| NodeSensor
    PythonCommand -->|HTTP Sync| PythonSensor

    NodeSensor -->|Publish Events| RabbitMQ
    PythonSensor -->|Publish Events| RabbitMQ
    NodeCommand -->|Publish Events| RabbitMQ
    PythonCommand -->|Publish Events| RabbitMQ

    RabbitMQ -->|Subscribe| NodeCommand
    RabbitMQ -->|Subscribe| PythonCommand

    style NodeSensor fill:#e1f5ff
    style PythonSensor fill:#e1f5ff
    style NodeCommand fill:#fff4e1
    style PythonCommand fill:#fff4e1
    style RabbitMQ fill:#ffe1f5
    style NodeSensorDB fill:#e1ffe1
    style PythonSensorDB fill:#e1ffe1
    style NodeCommandDB fill:#e1ffe1
    style PythonCommandDB fill:#e1ffe1
```

### 2. Sequence Diagram: Sensor Creation with Event-Driven Updates

This sequence diagram illustrates the flow when a sensor is created, showing both synchronous HTTP communication and asynchronous event-driven updates:

```mermaid
sequenceDiagram
    participant Client
    participant SensorService as Sensor Service<br/>(Node.js/Python)
    participant SensorDB as Sensor Database<br/>(PostgreSQL)
    participant RabbitMQ as RabbitMQ<br/>Event Bus
    participant CommandService as Command Service<br/>(Node.js/Python)
    participant CommandDB as Command Database<br/>(PostgreSQL)

    Client->>SensorService: POST /sensors<br/>(with API key)
    SensorService->>SensorService: Validate API key
    SensorService->>SensorService: Validate sensor data
    SensorService->>SensorDB: INSERT sensor
    SensorDB-->>SensorService: Sensor created
    SensorService->>RabbitMQ: Publish sensor.created event
    SensorService-->>Client: 201 Created<br/>(sensor data)

    Note over RabbitMQ: Event routing to subscribers

    RabbitMQ->>CommandService: Deliver sensor.created event
    CommandService->>CommandService: Process event
    CommandService->>CommandDB: Update dashboard<br/>(sensor summary)
    CommandService->>CommandDB: Create alert if needed
    CommandDB-->>CommandService: Updates saved

    Note over Client,CommandDB: Async event processing<br/>happens independently
```

### 3. Deployment Diagram: Docker Container Architecture

This diagram shows the deployment architecture with Docker containers, ports, resource limits, and network topology:

```mermaid
graph TB
    subgraph DockerHost[Docker Host]
        subgraph Network[a2_default Network]
            subgraph SensorContainers[Sensor Service Containers]
                NodeSensorContainer[Node Sensor Service<br/>Container: node-sensor-service-a2<br/>Port: 3000:3000<br/>CPU: 0.5 / Memory: 512MB]
                PythonSensorContainer[Python Sensor Service<br/>Container: python-sensor-service-a2<br/>Port: 8000:8000<br/>CPU: 0.5 / Memory: 512MB]
            end

            subgraph CommandContainers[Command Service Containers]
                NodeCommandContainer[Node Command Service<br/>Container: node-command-service-a2<br/>Port: 3001:3001<br/>CPU: 1.0 / Memory: 1GB]
                PythonCommandContainer[Python Command Service<br/>Container: python-command-service-a2<br/>Port: 8001:8001<br/>CPU: 1.0 / Memory: 1GB]
            end

            subgraph DatabaseContainers[Database Containers]
                NodeSensorDBContainer[(node-sensor-db-a2<br/>PostgreSQL 15<br/>Port: 5432:5432)]
                PythonSensorDBContainer[(python-sensor-db-a2<br/>PostgreSQL 15<br/>Port: 5433:5432)]
                NodeCommandDBContainer[(node-command-db-a2<br/>PostgreSQL 15<br/>Port: 5434:5432)]
                PythonCommandDBContainer[(python-command-db-a2<br/>PostgreSQL 15<br/>Port: 5435:5432)]
            end

            subgraph InfrastructureContainers[Infrastructure Containers]
                RabbitMQContainer[RabbitMQ<br/>Container: rabbitmq-a2<br/>Ports: 5672, 15672<br/>Management UI Available]
            end
        end
    end

    NodeSensorContainer -->|Connection Pool| NodeSensorDBContainer
    PythonSensorContainer -->|Connection Pool| PythonSensorDBContainer
    NodeCommandContainer -->|Connection Pool| NodeCommandDBContainer
    PythonCommandContainer -->|Connection Pool| PythonCommandDBContainer

    NodeSensorContainer -->|AMQP| RabbitMQContainer
    PythonSensorContainer -->|AMQP| RabbitMQContainer
    NodeCommandContainer -->|AMQP| RabbitMQContainer
    PythonCommandContainer -->|AMQP| RabbitMQContainer

    NodeCommandContainer -->|HTTP Client| NodeSensorContainer
    NodeCommandContainer -->|HTTP Client| PythonSensorContainer
    PythonCommandContainer -->|HTTP Client| NodeSensorContainer
    PythonCommandContainer -->|HTTP Client| PythonSensorContainer

    style NodeSensorContainer fill:#e1f5ff
    style PythonSensorContainer fill:#e1f5ff
    style NodeCommandContainer fill:#fff4e1
    style PythonCommandContainer fill:#fff4e1
    style RabbitMQContainer fill:#ffe1f5
    style NodeSensorDBContainer fill:#e1ffe1
    style PythonSensorDBContainer fill:#e1ffe1
    style NodeCommandDBContainer fill:#e1ffe1
    style PythonCommandDBContainer fill:#e1ffe1
```

## Key Features

### Database Per Service
- Each service has its own isolated PostgreSQL database
- No cross-database joins - all inter-service communication via HTTP APIs or events
- Persistent data storage with connection pooling
- Database migrations and seed data

### Command & Control Service
- Tactical dashboards for mission planning
- Alert management system
- Sensor data aggregation
- Threat assessment capabilities
- Mission planning based on sensor intelligence

### Inter-Service Communication

**Synchronous (HTTP/REST)**:
- Direct queries: `GET /sensors/{id}` - immediate response needed
- Simple operations: `POST /alerts` - needs immediate confirmation

**Asynchronous (RabbitMQ Events)**:
- High-volume sensor telemetry streaming
- Real-time dashboard updates
- Alert propagation to multiple subscribers
- Command broadcasting

### Resilience Patterns

**Bulkhead Pattern**:
- Separate connection pools for database, HTTP clients, and event bus
- Isolated resource pools prevent cascading failures
- Database pool: min 2, max 10 connections
- HTTP client pools: separate instances with connection limits
- Event bus: separate RabbitMQ connections

**Circuit Breaker**:
- Prevents cascading failures when dependencies are unhealthy
- State machine: CLOSED → OPEN → HALF-OPEN → CLOSED
- Applied to HTTP calls to sensor services
- Failure threshold: 5 failures, recovery timeout: 30 seconds

**Rate Limiting**:
- Token bucket algorithm
- General endpoints: 100 req/sec, burst 200
- Write operations: 50 req/sec, burst 100
- Prevents overload and abuse

**Worker Configuration**:
- Node.js: Cluster workers (configurable via WORKERS env var)
- Python: Uvicorn workers (configurable via WORKERS env var)
- Default: 2 workers per service

**Docker Resource Limits**:
- Sensor services: 0.5 CPU, 512MB memory
- Command services: 1.0 CPU, 1GB memory
- Infrastructure-level isolation

## API Endpoints

### Sensor Services

- `GET /health` - Health check with database status
- `GET /sensors` - List all sensors (with filtering and pagination)
- `GET /sensors/{sensor_id}` - Get specific sensor
- `POST /sensors` - Create new sensor (requires API key)

### Command & Control Services

**Synchronous Endpoints**:
- `GET /dashboards` - List tactical dashboards
- `GET /dashboards/{id}` - Get specific dashboard
- `POST /dashboards` - Create dashboard (requires API key)
- `GET /alerts` - List alerts (with filtering)
- `POST /alerts` - Create alert (requires API key, sync sensor validation)
- `PATCH /alerts/{id}/acknowledge` - Acknowledge alert

**Asynchronous Endpoints** (parallel HTTP calls):
- `POST /sensor-aggregate` - Aggregate multiple sensors in parallel
- `POST /mission-plan` - Create mission plan (fetches all sensors in parallel)
- `POST /threat-assessment` - Assess threats (parallel sensor fetches)

## Event Bus (RabbitMQ)

### Sensor Events (Published by Sensor Services)
- `sensor.created` - New sensor reading created
- `sensor.updated` - Sensor reading updated
- `sensor.alert` - Sensor anomaly detected

### Command Events (Published by Command & Control Services)
- `command.issued` - Tactical command issued
- `mission.status.changed` - Mission status updated
- `threat.level.changed` - Threat assessment changed
- `alert.acknowledged` - Alert acknowledged

### Event Subscriptions
- Command & Control services subscribe to `sensor.*` events
- Updates dashboards and creates alerts based on sensor events

## Getting Started

### Prerequisites

- Docker (v25.x or later)
- Docker Compose (v2.x or later)

### Running All Services

```bash
cd A2
docker compose up --build
```

This will start:
- 4 PostgreSQL databases
- 4 application services (2 sensor + 2 command)
- RabbitMQ with management UI (http://localhost:15672)

### Environment Variables

Set these before running (or use defaults):

```bash
export API_KEY=your-secure-api-key-here
export LOG_LEVEL=info
export WORKERS=2
```

### Testing the Services

#### Sensor Services

```bash
# Health check
curl http://localhost:3000/health  # Node.js
curl http://localhost:8000/health  # Python

# Get all sensors
curl http://localhost:3000/sensors
curl http://localhost:8000/sensors

# Create sensor (requires API key)
curl -X POST http://localhost:3000/sensors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secure-api-key-here" \
  -d '{
    "sensor_id": "temp_garage",
    "type": "temperature",
    "value": 65.0,
    "unit": "F"
  }'
```

#### Command & Control Services

```bash
# Health check
curl http://localhost:3001/health  # Node.js
curl http://localhost:8001/health  # Python

# Get dashboards
curl http://localhost:3001/dashboards

# Create mission plan (async parallel calls)
curl -X POST http://localhost:3001/mission-plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secure-api-key-here" \
  -d '{
    "mission_id": "mission_001"
  }'

# Aggregate sensors (async parallel calls)
curl -X POST http://localhost:3001/sensor-aggregate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secure-api-key-here" \
  -d '{
    "sensor_ids": ["temp_living_room", "humidity_basement", "motion_kitchen"]
  }'
```

### RabbitMQ Management UI

Access the RabbitMQ management interface at:
- URL: http://localhost:15672
- Username: admin
- Password: admin

## Project Structure

```
A2/
├── docker-compose.yml              # All services + databases + RabbitMQ
├── node-service/                   # Sensor Service (Node.js)
│   ├── src/
│   │   ├── db/                    # Database connection pool
│   │   ├── events/                # Event publishers
│   │   ├── migrations/            # Database migrations
│   │   └── ...
│   └── Dockerfile
├── python-service/                 # Sensor Service (Python)
│   ├── src/
│   │   ├── db/                    # Database connection pool
│   │   ├── events/                # Event publishers
│   │   ├── migrations/            # Database migrations
│   │   └── ...
│   └── Dockerfile
├── command-node-service/           # Command & Control (Node.js)
│   ├── src/
│   │   ├── db/                    # Database connection pool
│   │   ├── clients/               # HTTP clients (sync/async)
│   │   ├── events/                # Event subscribers/publishers
│   │   └── ...
│   └── Dockerfile
├── command-python-service/         # Command & Control (Python)
│   ├── src/
│   │   ├── db/                    # Database connection pool
│   │   ├── clients/               # HTTP clients (sync/async)
│   │   ├── events/                # Event subscribers/publishers
│   │   └── ...
│   └── Dockerfile
└── README.md
```

## Resilience Patterns Implementation

### Bulkhead Pattern

**Database Connections**:
- Separate connection pools per service
- Pool size: min 2, max 10 connections
- Isolated from HTTP and event bus connections

**HTTP Clients**:
- Separate axios/httpx instances for sync and async calls
- Connection limits: sync (5), async (20)
- Prevents one slow service from blocking others

**Event Bus**:
- Separate RabbitMQ connections
- Isolated from database and HTTP pools

### Circuit Breaker

Implemented in `sensorClient.js` and `sensor_client.py`:
- Failure threshold: 5 consecutive failures
- Recovery timeout: 30 seconds
- States: CLOSED → OPEN → HALF_OPEN → CLOSED

### Rate Limiting

Token bucket algorithm:
- General endpoints: 100 requests/second, burst 200
- Write endpoints: 50 requests/second, burst 100
- Returns 429 (Too Many Requests) when limit exceeded

### Worker Processes

**Node.js**:
- Uses `cluster` module
- Configurable via `WORKERS` environment variable
- Default: 2 workers

**Python**:
- Uses `uvicorn` with `--workers` flag
- Configurable via `WORKERS` environment variable
- Default: 2 workers

## Database Schema

### Sensor Services

**sensors** table:
- `sensor_id` (VARCHAR PRIMARY KEY)
- `type` (VARCHAR, enum: temperature, humidity, motion, pressure, light)
- `value` (NUMERIC)
- `unit` (VARCHAR)
- `timestamp` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Command & Control Services

**tactical_dashboards** table:
- `dashboard_id` (VARCHAR PRIMARY KEY)
- `mission_id` (VARCHAR)
- `sensor_summary` (JSONB)
- `threat_level` (VARCHAR, enum: low, medium, high, critical)
- `status` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**alerts** table:
- `alert_id` (VARCHAR PRIMARY KEY)
- `sensor_id` (VARCHAR)
- `alert_type` (VARCHAR)
- `severity` (VARCHAR, enum: low, medium, high, critical)
- `message` (TEXT)
- `acknowledged` (BOOLEAN)
- `created_at` (TIMESTAMP)

## Event Schema

All events follow this structure:

```json
{
  "event_type": "sensor.created",
  "event_id": "event_1234567890_abc123",
  "timestamp": "2026-01-18T15:45:00Z",
  "source": "node-sensor-service",
  "data": {
    "sensor_id": "temp_living_room",
    "type": "temperature",
    "value": 72.4,
    "unit": "F"
  }
}
```

## Environment Variables

### Sensor Services

- `PORT` - Service port (default: 3000 for Node.js, 8000 for Python)
- `API_KEY` - API key for authentication
- `LOG_LEVEL` - Logging level (default: info)
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `RABBITMQ_URL` - RabbitMQ connection URL
- `WORKERS` - Number of worker processes (Node.js only)

### Command & Control Services

- `PORT` - Service port (default: 3001 for Node.js, 8001 for Python)
- `API_KEY` - API key for authentication
- `LOG_LEVEL` - Logging level
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `SENSOR_SERVICE_URL` - URL of sensor service to call
- `RABBITMQ_URL` - RabbitMQ connection URL
- `WORKERS` - Number of worker processes

## Testing

### Manual Testing

1. **Test Database Connectivity**:
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"ok","service":"node","database":"connected"}
   ```

2. **Test Sensor Creation with Event Publishing**:
   ```bash
   curl -X POST http://localhost:3000/sensors \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer default-api-key-change-me" \
     -d '{"sensor_id":"test_sensor","type":"temperature","value":70,"unit":"F"}'
   ```
   Check RabbitMQ management UI to see the event published.

3. **Test Async Aggregation**:
   ```bash
   curl -X POST http://localhost:3001/sensor-aggregate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer default-api-key-change-me" \
     -d '{"sensor_ids":["temp_living_room","humidity_basement"]}'
   ```

4. **Test Circuit Breaker**:
   Stop the sensor service and make multiple requests to Command & Control service. After 5 failures, circuit should open.

5. **Test Rate Limiting**:
   Make rapid requests to any endpoint. After exceeding the limit, should receive 429 status.

> **Note**: See the [Architecture Diagrams](#architecture-diagrams) section below for detailed visual representations of the system architecture, sequence flows, and deployment topology.

## Key Differences from A1

1. **Database Per Service**: Each service has its own PostgreSQL database
2. **Command & Control Service**: New tactical service for mission planning
3. **Event Bus**: RabbitMQ for asynchronous event-driven communication
4. **Resilience Patterns**: Bulkheads, circuit breakers, rate limiting
5. **Worker Processes**: Multi-worker configuration for performance
6. **Resource Limits**: Docker CPU/memory limits for isolation
7. **Hybrid Communication**: HTTP for sync, RabbitMQ for async

## Troubleshooting

### Database Connection Issues

- Check database health: `docker compose ps`
- Verify environment variables are set correctly
- Check database logs: `docker compose logs node-sensor-db`

### RabbitMQ Connection Issues

- Access management UI: http://localhost:15672
- Check RabbitMQ logs: `docker compose logs rabbitmq`
- Verify RABBITMQ_URL environment variable

### Service Startup Issues

- Check service logs: `docker compose logs node-sensor-service`
- Verify wait-for-it script is working
- Check database is ready before service starts

## Summary

This assignment demonstrates:
- ✅ Database per service pattern (4 isolated databases)
- ✅ Command & Control service for tactical operations
- ✅ Hybrid communication (HTTP sync + RabbitMQ async)
- ✅ Resilience patterns (bulkheads, circuit breakers, rate limiting)
- ✅ Worker processes for performance
- ✅ Docker resource limits for isolation
- ✅ Event-driven architecture with RabbitMQ
- ✅ Synchronous and asynchronous API call patterns
