# Scalable Microservices - Assignment 0

## Project Overview

This project implements two parallel microservices for an **IoT Smart Home Sensors** domain, built with Node.js (Express) and Python (FastAPI). Both services provide identical functionality for sensor data retrieval and health monitoring.

## Domain Selection

I chose the **IoT Smart Home Sensors** domain because it is naturally decomposable into microservices, emphasizes data ingestion and retrieval, and scales cleanly into more advanced distributed systems patterns later in the semester. The domain is naturally event-driven, making it ideal for microservices architecture, while remaining data-centric and simple enough to avoid UI/state complexity early in the course.

## Technology Stack

I selected **Node.js** and **Python (FastAPI)** to compare two popular, production-grade approaches to building asynchronous microservices, each with different concurrency and ecosystem tradeoffs.

### Versions

- **Node.js**: v20.x
- **Express**: v4.18.2
- **Python**: 3.11.x
- **FastAPI**: 0.109.0
- **Uvicorn**: 0.27.0
- **Docker**: 25.x
- **Docker Compose**: v2.x

## Architecture

Both services implement identical API endpoints:

- **`GET /health`** - Returns service health status
- **`GET /sensors`** - Returns a JSON array of sensor readings

### Service Endpoints

#### Node.js Service (Port 3000)
- `http://localhost:3000/health`
- `http://localhost:3000/sensors`

#### Python Service (Port 8000)
- `http://localhost:8000/health`
- `http://localhost:8000/health` (FastAPI also provides `/docs` for interactive API documentation)

## Dataset

The services use static in-memory sensor data representing various IoT sensor readings:

```json
[
  {
    "sensor_id": "temp_living_room",
    "type": "temperature",
    "value": 72.4,
    "unit": "F",
    "timestamp": "2026-01-18T14:30:00Z"
  },
  {
    "sensor_id": "humidity_basement",
    "type": "humidity",
    "value": 45,
    "unit": "%",
    "timestamp": "2026-01-18T14:30:00Z"
  }
]
```

## Docker Hub Images

Both services are available as pre-built Docker images on Docker Hub for easy deployment:

- **Node.js Service**: [`timwillie73/node-sensor-service:latest`](https://hub.docker.com/r/timwillie73/node-sensor-service)
- **Python Service**: [`timwillie73/python-sensor-service:latest`](https://hub.docker.com/r/timwillie73/python-sensor-service)

### Quick Start with Docker Hub Images

You can run the services directly from Docker Hub without building locally:

```bash
# Pull and run Node.js service
docker run -d -p 3000:3000 --name node-sensor-service timwillie73/node-sensor-service:latest

# Pull and run Python service
docker run -d -p 8000:8000 --name python-sensor-service timwillie73/python-sensor-service:latest
```

Or use the provided `docker-compose.hub.yml` file that uses pre-built images:

```bash
docker compose -f docker-compose.hub.yml up
```

This will automatically pull the images from Docker Hub if they're not already present locally.

## Getting Started

### Prerequisites

- Docker (v25.x or later)
- Docker Compose (v2.x or later)

### Verify Docker Installation

```bash
docker run hello-world
```

### Running the Services

#### Option 1: Using Pre-built Docker Hub Images (Recommended for Grading)

1. **Pull and run using Docker Compose:**
   ```bash
   docker compose pull
   docker compose up
   ```

2. **Or pull images individually:**
   ```bash
   docker pull timwillie73/node-sensor-service:latest
   docker pull timwillie73/python-sensor-service:latest
   ```

#### Option 2: Build from Source

1. **Build and start all services:**
   ```bash
   docker compose up --build
   ```

2. **Run in detached mode:**
   ```bash
   docker compose up -d --build
   ```

3. **View logs:**
   ```bash
   docker compose logs -f
   ```

4. **Stop services:**
   ```bash
   docker compose down
   ```

### Testing the Services

#### Health Checks

```bash
# Node.js service
curl http://localhost:3000/health

# Python service
curl http://localhost:8000/health
```

Expected responses:
```json
{"status":"ok","service":"node"}
{"status":"ok","service":"python"}
```

#### Sensor Data

```bash
# Node.js service
curl http://localhost:3000/sensors

# Python service
curl http://localhost:8000/sensors
```

#### Interactive API Documentation (FastAPI)

Visit `http://localhost:8000/docs` in your browser for FastAPI's automatic interactive API documentation.

## Project Structure

```
.
├── node-service/
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
├── python-service/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
├── docker-compose.yml
└── README.md
```
# Scalable-Microservices
