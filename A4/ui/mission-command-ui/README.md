# Mission Command UI (A4)

React + Vite console that shows **live** service health and either **demo** or **live** mission-style panels.

## Environment variables

Set at **build** time (Vite embeds `VITE_*` into the bundle).

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_COMMAND_BASE_URL` | `http://localhost:3001` | Node command service (health, `/alerts`, `/observability/summary` when live mode is on). |
| `VITE_SENSOR_BASE_URL` | `http://localhost:3000` | Node sensor service (health). |
| `VITE_USE_LIVE_MISSION_DATA` | (unset / false) | Set to `true` to drive timeline, priority alerts, open-alerts KPI, and command HTTP error KPI from the command service instead of `src/simulation.ts`. |

## Dev server proxy (optional)

With `npm run dev`, Vite proxies same-origin paths to local services so you can avoid browser CORS issues when command/sensor use a restrictive `ALLOWED_ORIGIN`:

- `/api/command/*` → `http://localhost:3001/*`
- `/api/sensor/*` → `http://localhost:3000/*`

Example:

```bash
VITE_COMMAND_BASE_URL=/api/command VITE_SENSOR_BASE_URL=/api/sensor npm run dev
```

## Command service requirements (live mission mode)

- `GET /alerts?acknowledged=false` must be reachable (no auth on GET).
- `GET /observability/summary` returns HTTP 5xx share between polls when `ENABLE_METRICS=true` on the command service. If metrics are disabled, the error KPI shows "metrics disabled".

## Scripts

```bash
npm install
npm run dev
npm run build
```
