# ADR-003: Resilience Patterns Implementation

## Status
Accepted

## Context
Microservices must be resilient to failures. We need to implement patterns that prevent cascading failures and handle degraded service gracefully.

## Decision
We will implement three key resilience patterns:

### 1. Bulkhead Pattern
**Purpose**: Isolate resource pools to prevent cascading failures

**Implementation:**
- Separate connection pools for database (min: 2, max: 10)
- Separate HTTP client pools for sync (max: 5) and async (max: 20) calls
- Separate RabbitMQ connections for event publishing

**Rationale**: If one resource pool is exhausted, others remain available.

### 2. Circuit Breaker Pattern
**Purpose**: Prevent repeated calls to failing dependencies

**Implementation:**
- Failure threshold: 5 consecutive failures
- Recovery timeout: 30 seconds
- States: CLOSED → OPEN → HALF_OPEN → CLOSED
- Applied to all HTTP calls to sensor services

**Rationale**: Fails fast when dependency is down, prevents resource exhaustion.

### 3. Rate Limiting Pattern
**Purpose**: Prevent overload and abuse

**Implementation:**
- Token bucket algorithm
- General endpoints: 100 req/sec, burst 200
- Write operations: 50 req/sec, burst 100
- Applied at middleware level

**Rationale**: Protects services from traffic spikes and DoS attacks.

### Consequences
**Positive:**
- System remains stable under load
- Failures are contained
- Services degrade gracefully
- Better observability of failure modes

**Negative:**
- More complex code
- Need to tune thresholds
- Potential for false positives (circuit breaker)
- Additional latency (rate limiting)

## Monitoring
- Log circuit breaker state changes
- Track rate limit violations
- Monitor connection pool usage
- Alert on bulkhead exhaustion

## References
- Microservices Resilience Patterns
- Circuit Breaker Pattern
- Bulkhead Pattern
- Rate Limiting Strategies
