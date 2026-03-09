# ADR-001: Database Per Service Pattern

## Status
Accepted

## Context
In Assignment 1, all services used in-memory storage. For Assignment 2, we need persistent data storage and proper data isolation between services. We need to decide on a database strategy that supports:
- Data persistence across service restarts
- Service isolation (no shared databases)
- Independent scaling of services
- No cross-database joins

## Decision
We will implement the **Database Per Service** pattern where each microservice has its own dedicated PostgreSQL database.

### Implementation Details
- **Node.js Sensor Service** → `node_sensor_db` (PostgreSQL)
- **Python Sensor Service** → `python_sensor_db` (PostgreSQL)
- **Node.js Command Service** → `node_command_db` (PostgreSQL)
- **Python Command Service** → `python_command_db` (PostgreSQL)

### Rationale
1. **Service Isolation**: Each service owns its data completely
2. **Independent Scaling**: Databases can be scaled independently
3. **Technology Flexibility**: Each service could use different database technologies if needed
4. **Fault Isolation**: Database failures don't cascade across services
5. **Team Autonomy**: Different teams can manage their own databases

### Consequences
**Positive:**
- Clear data ownership boundaries
- Services can evolve independently
- Better performance (no cross-database queries)
- Easier to understand data flow

**Negative:**
- More infrastructure to manage (4 databases)
- No cross-database joins (must use APIs or events)
- Data consistency requires eventual consistency patterns
- More complex deployment

### Migration Strategy
- Each service runs database migrations on startup
- Migrations are versioned and idempotent
- Seed data is included in migration files

## References
- Microservices Pattern: Database Per Service
- PostgreSQL 15 for all databases (consistency)
