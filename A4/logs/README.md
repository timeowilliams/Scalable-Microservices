# A4 Logs Folder

Place reproducible command output and experiment evidence here.

Recommended files:

- `baseline-small.json`, `baseline-medium.json`, `baseline-large.json`
- `scaled-small.json`, `scaled-medium.json`, `scaled-large.json`
- `chaos-after-kill.json`, `chaos-db-down.json`, `chaos-db-recovered.json`
- `node-command-service-scaled.log`
- `metrics-node-command.prom`, `metrics-node-sensor.prom`

Capture approach:

- Prefer redirecting full command output to timestamped files.
- Keep raw logs plus short excerpts in `README.md` report sections.
