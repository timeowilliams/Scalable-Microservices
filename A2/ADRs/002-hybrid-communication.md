# ADR-002: Hybrid Communication Pattern (HTTP + RabbitMQ)

## Status
Accepted

## Context
Services need to communicate with each other. We need to decide when to use synchronous HTTP calls vs asynchronous event-driven communication via RabbitMQ.

## Decision
We will use a **hybrid communication pattern**:
- **Synchronous HTTP/REST** for operations requiring immediate response
- **Asynchronous RabbitMQ Events** for high-volume, fire-and-forget operations

### Synchronous HTTP Use Cases
- `GET /sensors/{id}` - Immediate response needed for dashboard display
- `POST /alerts` - Need immediate confirmation that alert was created
- Health checks and simple queries

### Asynchronous RabbitMQ Use Cases
- `sensor.created` - High-volume sensor telemetry streaming
- `sensor.updated` - Real-time dashboard updates
- `sensor.alert` - Alert propagation to multiple subscribers
- `command.issued` - Command broadcasting

### Rationale
1. **HTTP for Sync**: Simple, immediate feedback, easy to debug
2. **Events for Async**: Decouples services, handles high volume, supports multiple subscribers
3. **Hybrid Approach**: Best of both worlds - use the right tool for the job

### Consequences
**Positive:**
- Optimal performance for each use case
- Services remain loosely coupled
- Can handle high-volume event streams
- Immediate feedback when needed

**Negative:**
- Two communication mechanisms to maintain
- More complex architecture
- Eventual consistency for async operations
- Need to handle both sync and async error cases

## Implementation
- HTTP clients with circuit breakers and timeouts
- RabbitMQ with topic exchanges for event routing
- Event schemas for type safety

## References
- Microservices Communication Patterns
- RabbitMQ Best Practices
