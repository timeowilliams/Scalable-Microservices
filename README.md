# Scalable Microservices

## Project Overview

This repository contains a series of assignments exploring scalable microservices architecture using an **IoT Smart Home Sensors** domain. The project implements parallel microservices in Node.js (Express) and Python (FastAPI) to compare different approaches to building asynchronous, distributed systems.

## Domain Selection

I chose the **IoT Smart Home Sensors** domain because it is naturally decomposable into microservices, emphasizes data ingestion and retrieval, and scales cleanly into more advanced distributed systems patterns. The domain is naturally event-driven, making it ideal for microservices architecture, while remaining data-centric and simple enough to avoid UI/state complexity early in the course.

This domain is also relevant to my work for the Army/soldiers operating in the field and relying on sensor technology to fight in the battlefield. It provides a practical foundation that connects to real-world applications where sensor data collection, processing, and distribution are critical for operational success.

## Technology Stack

The project uses **Node.js** and **Python (FastAPI)** to compare two popular, production-grade approaches to building asynchronous microservices, each with different concurrency and ecosystem tradeoffs.

- **Node.js**: Event-driven, non-blocking I/O
- **Python (FastAPI)**: Async/await support with automatic API documentation
- **PostgreSQL**: Relational database (introduced in A2)
- **RabbitMQ**: Message broker for event-driven communication (introduced in A2)
- **Docker**: Containerization for consistent deployment
- **Docker Compose**: Multi-container orchestration

## Assignments

This repository is organized by assignment, with each assignment building upon previous work:

### [Assignment 0: Initial Microservices Setup](A0/)

Initial implementation of two parallel microservices (Node.js and Python) providing basic sensor data retrieval and health monitoring endpoints. This assignment establishes the foundation with Docker containerization and demonstrates the core differences between Express and FastAPI implementations.

**Key Features:**
- Basic REST API endpoints (`/health`, `/sensors`)
- Docker containerization
- Docker Hub image distribution
- Parallel implementation in Node.js and Python

### [Assignment 1: Enhanced Sensor Microservice](A1/)

Enhanced sensor microservice with dependency injection, input validation, API key authentication, structured logging, and comprehensive testing. Demonstrates framework-specific patterns for DI, configuration management, and security.

**Key Features:**
- Dependency injection (manual in Node.js, built-in in FastAPI)
- API key authentication
- Input validation and error handling
- Structured logging with correlation IDs
- OpenAPI 3.0 specification
- Comprehensive integration tests

### [Assignment 2: Database Per Service + Command & Control](A2/)

Implements the database per service pattern with separate PostgreSQL databases for each microservice, adds a Command & Control service for tactical operations, integrates RabbitMQ for event-driven communication, and implements resilience patterns (bulkheads, circuit breakers, rate limiting).

**Key Features:**
- Database per service pattern (4 PostgreSQL databases)
- Command & Control service for tactical dashboards and alert management
- RabbitMQ event bus for asynchronous communication
- Resilience patterns (circuit breakers, rate limiting, bulkheads)
- Inter-service communication (HTTP/REST + RabbitMQ events)
- Docker resource limits for service isolation

### Assignment 3: [To be added]

## Project Structure

```
.
├── A0/                      # Assignment 0: Initial Microservices Setup
│   ├── node-service/        # Simple Node.js service (basic endpoints)
│   ├── python-service/      # Simple Python service (basic endpoints)
│   ├── docker-compose.yml
│   ├── docker-compose.hub.yml
│   ├── README.md
│   ├── health_ping.png
│   └── sensors_ping.png
├── A1/                      # Assignment 1: Enhanced Sensor Microservice
│   ├── node-service/        # Enhanced Node.js service (DI, auth, validation)
│   ├── python-service/      # Enhanced Python service (DI, auth, validation)
│   ├── docker-compose.yml
│   ├── docker-compose.hub.yml
│   ├── README.md
│   ├── api_spec.yaml
│   └── architecture.png
├── A2/                      # Assignment 2: Database Per Service + Command & Control
│   ├── node-service/        # Node.js sensor service with PostgreSQL
│   ├── python-service/      # Python sensor service with PostgreSQL
│   ├── command-node-service/ # Node.js command & control service
│   ├── command-python-service/ # Python command & control service
│   ├── docker-compose.yml   # Includes PostgreSQL, RabbitMQ, all services
│   └── README.md
├── A3/                      # Assignment 3: [To be added]
└── README.md                # This file
```

## Getting Started

Each assignment has its own detailed README with specific setup and running instructions:

- [Assignment 0 Setup](A0/README.md#getting-started)
- [Assignment 1 Setup](A1/README.md#running-the-services)
- [Assignment 2 Setup](A2/README.md)

Each assignment contains its own isolated service implementations, allowing you to:
- Run services independently for each assignment
- Compare implementations across assignments
- Build upon previous work without affecting earlier assignments

### General Prerequisites

- Docker (v25.x or later)
- Docker Compose (v2.x or later)
- Node.js v20.x (for local development)
- Python 3.11.x (for local development)

## Development Philosophy

This project explores the tradeoffs between different microservices frameworks and patterns:

- **Explicit vs. Declarative**: Node.js/Express requires explicit dependency wiring, while FastAPI provides declarative dependency injection
- **Validation**: Manual validation in Node.js vs. automatic Pydantic validation in Python
- **Developer Experience**: More boilerplate in Node.js vs. less code and automatic documentation in FastAPI
- **Performance**: Event-driven Node.js vs. async/await Python with Uvicorn

Each assignment builds upon these foundations to explore more advanced distributed systems concepts.
