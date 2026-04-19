# A4 Security Hardening Notes

## Improvement 1: Restricted Ingress

- Only `node-command-service` is exposed publicly in `A4/docker-compose.yml`.
- Sensor services and databases run on internal-only network paths.
- RabbitMQ management UI remains exposed for demonstration evidence but can be disabled for stricter deployments.

Operational impact:
- Reduces attack surface and enforces a single controlled entry point.
- Supports least-privilege network boundaries.

## Improvement 2: Secrets and Header Hardening

- API key is sourced from `A4/config/.env` instead of hardcoded values.
- Browser-facing security headers are set in Node services:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - Optional HSTS when running behind HTTPS.

Operational impact:
- Moves credentials out of source code defaults for deployment workflows.
- Hardens response behavior against common browser-based attacks.

## Additional A4 Security Controls

- Explicit CORS allowlist via `ALLOWED_ORIGIN`.
- Role-aware mission UI modes (analyst vs commander) for demo policy separation.
