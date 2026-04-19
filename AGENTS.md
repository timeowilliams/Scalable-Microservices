## Learned User Preferences

- Keep new capstone and assignment source for this course work under `A4/` in this repository.
- In writeups and analysis, emphasize why results look the way they do—not only the raw metrics or charts.
- When documenting or building async/messaging-heavy paths, treat backpressure as a first-class concern and call out what is configurable versus purely implicit queue behavior.
- For mission and ops UIs here, favor a disciplined, analytical visual language (Swiss typographic / Palantir-style command console) when making styling choices.
- Keep the repository root `README.md` pointed at the A4 capstone so that slice is easy to discover.

## Learned Workspace Facts

- `A4/` is the capstone area: Dockerized microservices, observability, security-related config, mission UI, and artifacts such as logs and screenshots for the assignment.
- The Mission Command UI in `A4/ui/mission-command-ui` polls Node Command and Node Sensor with `GET /health` about every 3.5s, using `VITE_COMMAND_BASE_URL` (default `http://localhost:3001`) and `VITE_SENSOR_BASE_URL` (default `http://localhost:3000`).
- Mission timeline, alerts, and backlog/error KPIs in that UI follow `VITE_USE_LIVE_MISSION_DATA` at build time: either live data from the command service or frontend simulation.
