import { useEffect, useMemo, useState } from "react";
import { buildMissionEvent, missionCards, type MissionEvent } from "./simulation";
import "./App.css";

type ServiceStatus = {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  detail: string;
};

type AlertItem = {
  id: string;
  severity: "critical" | "high" | "medium";
  title: string;
  source: string;
  at: string;
};

const POLL_MS = 3500;
const COMMAND_BASE = import.meta.env.VITE_COMMAND_BASE_URL || "http://localhost:3001";
const SENSOR_BASE = import.meta.env.VITE_SENSOR_BASE_URL || "http://localhost:3000";

export default function App() {
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([
    { name: "Node Command", status: "down", latencyMs: 0, detail: "No data yet" },
    { name: "Node Sensor", status: "down", latencyMs: 0, detail: "No data yet" },
  ]);
  const [missionEvents, setMissionEvents] = useState<MissionEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [queueDepth, setQueueDepth] = useState(0);
  const [errorRate, setErrorRate] = useState(0);
  const [operatorRole, setOperatorRole] = useState<"analyst" | "commander">("analyst");

  useEffect(() => {
    const controller = new AbortController();
    const pollHealth = async () => {
      const checks = [
        { name: "Node Command", base: COMMAND_BASE },
        { name: "Node Sensor", base: SENSOR_BASE },
      ];

      const results = await Promise.all(
        checks.map(async (check) => {
          const start = performance.now();
          try {
            const resp = await fetch(`${check.base}/health`, {
              signal: controller.signal,
              headers: { "X-Correlation-ID": `a4-ui-${Date.now()}` },
            });
            const elapsed = Math.round(performance.now() - start);
            const payload = (await resp.json()) as { status?: string; database?: string };
            return {
              name: check.name,
              status: resp.ok && payload.status === "ok" ? "healthy" : "degraded",
              latencyMs: elapsed,
              detail: payload.database || `HTTP ${resp.status}`,
            } as ServiceStatus;
          } catch {
            return {
              name: check.name,
              status: "down",
              latencyMs: 0,
              detail: "Connection failed",
            } as ServiceStatus;
          }
        })
      );

      setServiceStatuses(results);
      setLastUpdated(new Date().toISOString());
    };

    pollHealth();
    const timer = window.setInterval(pollHealth, POLL_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const event = buildMissionEvent();
      setMissionEvents((prev) => [event, ...prev].slice(0, 8));
      if (event.severity !== "low") {
        const mappedSeverity: AlertItem["severity"] =
          event.severity === "critical"
            ? "critical"
            : event.severity === "high"
              ? "high"
              : "medium";
        setAlerts((prev) => [
          {
            id: event.id,
            severity: mappedSeverity,
            title: event.summary,
            source: event.zone,
            at: event.timestamp,
          },
          ...prev,
        ].slice(0, 10));
      }
      setQueueDepth((q) => Math.max(0, q + (event.severity === "critical" ? 5 : 2) - 2));
      setErrorRate((r) => {
        const jitter = event.severity === "critical" ? 0.8 : 0.15;
        return Number(Math.max(0, Math.min(8, r + jitter - 0.1)).toFixed(2));
      });
    }, 2800);
    return () => window.clearInterval(timer);
  }, []);

  const kpis = useMemo(() => {
    const healthy = serviceStatuses.filter((s) => s.status === "healthy").length;
    const avgLatency =
      serviceStatuses.length > 0
        ? Math.round(serviceStatuses.reduce((sum, s) => sum + s.latencyMs, 0) / serviceStatuses.length)
        : 0;
    return [
      { label: "Services Healthy", value: `${healthy}/${serviceStatuses.length}`, trend: "live" },
      { label: "Avg Health Latency", value: `${avgLatency} ms`, trend: "poll 3.5s" },
      { label: "Queue Backlog", value: String(queueDepth), trend: "hybrid signal" },
      { label: "Error Rate", value: `${errorRate}%`, trend: "rolling" },
    ];
  }, [serviceStatuses, queueDepth, errorRate]);

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">A4 Mission Operations Console</p>
          <h1>Commander Operational Picture</h1>
          <p className="lede">
            Hybrid stream with real service telemetry and simulated mission events for analyst workflows.
          </p>
        </div>
        <div className="role-switch">
          <label htmlFor="roleSelect">Role View</label>
          <select
            id="roleSelect"
            value={operatorRole}
            onChange={(e) => setOperatorRole(e.target.value as "analyst" | "commander")}
          >
            <option value="analyst">Analyst</option>
            <option value="commander">Commander</option>
          </select>
        </div>
      </header>

      <section className="kpis" aria-label="Operational indicators">
        {kpis.map((kpi) => (
          <article className="kpi-card" key={kpi.label}>
            <p className="kpi-label">{kpi.label}</p>
            <p className="kpi-value">{kpi.value}</p>
            <p className="kpi-trend">{kpi.trend}</p>
          </article>
        ))}
      </section>

      <section className="grid">
        <article className="panel" aria-labelledby="serviceHealthHeading">
          <div className="panel-head">
            <h2 id="serviceHealthHeading">Service Health</h2>
            <span className="updatedAt" role="status" aria-live="polite">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          </div>
          <ul className="status-list">
            {serviceStatuses.map((svc) => (
              <li className="status-row" key={svc.name}>
                <span className={`badge ${svc.status}`}>{svc.status}</span>
                <span className="svc-name">{svc.name}</span>
                <span className="svc-latency">{svc.latencyMs} ms</span>
                <span className="svc-detail">{svc.detail}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel" aria-labelledby="timelineHeading">
          <div className="panel-head">
            <h2 id="timelineHeading">Mission Timeline</h2>
            <span className="legend">Simulated live events</span>
          </div>
          <ul className="timeline">
            {missionEvents.length === 0 && <li className="empty">Awaiting mission stream...</li>}
            {missionEvents.map((event) => (
              <li className="timeline-row" key={event.id}>
                <span className={`badge ${event.severity}`}>{event.severity}</span>
                <span className="event-summary">{event.summary}</span>
                <span className="event-meta">{event.zone}</span>
                <span className="event-meta">{new Date(event.timestamp).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel" aria-labelledby="alertHeading">
          <div className="panel-head">
            <h2 id="alertHeading">Priority Alerts</h2>
            <span className="legend">
              {operatorRole === "commander" ? "Commander escalation queue" : "Analyst triage queue"}
            </span>
          </div>
          <ul className="timeline">
            {alerts.length === 0 && <li className="empty">No active alerts</li>}
            {alerts.map((alert) => (
              <li className="timeline-row" key={alert.id}>
                <span className={`badge ${alert.severity}`}>{alert.severity}</span>
                <span className="event-summary">{alert.title}</span>
                <span className="event-meta">{alert.source}</span>
                <span className="event-meta">{new Date(alert.at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel" aria-labelledby="missionCardsHeading">
          <div className="panel-head">
            <h2 id="missionCardsHeading">Mission Cards</h2>
            <span className="legend">Scenario context</span>
          </div>
          <div className="cards">
            {missionCards.map((card) => (
              <section key={card.id} className="mission-card">
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <dl>
                  <dt>Objective</dt>
                  <dd>{card.objective}</dd>
                  <dt>Window</dt>
                  <dd>{card.window}</dd>
                </dl>
              </section>
            ))}
          </div>
        </article>
      </section>

      <footer className="footer-note">
        <p>
          Real feeds: health telemetry from command and sensor services. Simulated feeds: mission events for analyst response.
        </p>
      </footer>
    </main>
  );
}
