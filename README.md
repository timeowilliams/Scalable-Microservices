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

### Testing Docker Hub Images

To verify the Docker Hub images work correctly, you can use the provided test script:

```bash
./test-dockerhub.sh
```

This script will:
1. Pull the latest images from Docker Hub
2. Start both services
3. Test the `/health` and `/sensors` endpoints for both services
4. Display formatted JSON responses

Alternatively, you can manually test:

```bash
# Pull images
docker pull timwillie73/node-sensor-service:latest
docker pull timwillie73/python-sensor-service:latest

# Start services
docker run -d -p 3000:3000 --name node-sensor-service timwillie73/node-sensor-service:latest
docker run -d -p 8000:8000 --name python-sensor-service timwillie73/python-sensor-service:latest

# Wait a few seconds for services to start, then test
curl http://localhost:3000/health
curl http://localhost:3000/sensors
curl http://localhost:8000/health
curl http://localhost:8000/sensors
```

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
├── docker-compose.hub.yml
├── test-dockerhub.sh
└── README.md
```

## Reflection

I chose the smart IoT domain because I find external sensor data relevant to my work for the Army/soldiers operating in the field and relying on sensor technology to fight in the battlefield. This domain provides a practical foundation that connects to real-world applications where sensor data collection, processing, and distribution are critical for operational success.

For the two languages, I primarily use JavaScript/Node for frontend technologies and Python for data science tasks. It would be cool to compare both of them and optimize future microservices written in these languages. This project allows me to evaluate the performance, development experience, and ecosystem differences between Node.js and Python (FastAPI) in a microservices context, which will inform future architectural decisions.

Everything worked smoothly during implementation - nothing confused me. The Docker containerization process was straightforward, and both services deployed without issues. The parallel implementation in both languages provided valuable insights into the tradeoffs between event-driven Node.js and async Python frameworks.


## Screenshots

### Health Endpoint Test

![Health Endpoint Test](health_ping.png)

*API client test showing successful GET request to `localhost:3000/health` (Node.js service). Response: `200 OK` in 38ms, returning `{"status": "ok", "service": "node"}`.*

### Sensors Endpoint Test

![Sensors Endpoint Test](sensors_ping.png)

*API client test showing successful GET request to `localhost:8000/sensors` (Python service). Response: `200 OK` in 47ms, returning an array of sensor readings including temperature (temp_living_room, temp_bedroom), humidity (humidity_basement, humidity_living_room), and motion (motion_kitchen) sensors with timestamps.*
