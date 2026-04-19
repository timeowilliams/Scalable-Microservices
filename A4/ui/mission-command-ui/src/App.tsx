import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchObservabilitySummary,
  fetchOpenAlerts,
  type CommandAlert,
} from "./commandApi";
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
const USE_LIVE_MISSION_DATA = import.meta.env.VITE_USE_LIVE_MISSION_DATA === "true";

function normalizeMissionSeverity(s: string): MissionEvent["severity"] {
  if (s === "critical" || s === "high" || s === "medium" || s === "low") return s;
  return "medium";
}

function alertToMissionEvent(a: CommandAlert): MissionEvent {
  return {
    id: a.alert_id,
    severity: normalizeMissionSeverity(a.severity),
    zone: a.sensor_id || a.alert_type,
    summary: a.message,
    timestamp: a.created_at,
  };
}

function commandAlertToAlertItem(a: CommandAlert): AlertItem {
  const s = a.severity;
  const severity: AlertItem["severity"] =
    s === "critical" || s === "high" || s === "medium" ? s : "medium";
  return {
    id: a.alert_id,
    severity,
    title: a.message,
    source: a.sensor_id || a.alert_type,
    at: a.created_at,
  };
}

function PanelHeader({
  titleId,
  title,
  sourceMode,
  children,
}: {
  titleId: string;
  title: string;
  sourceMode: "live" | "demo";
  children?: ReactNode;
}) {
  return (
    <div className="panel-head">
      <div className="panel-title-row">
        <h2 id={titleId}>{title}</h2>
        <span
          className={`source-badge ${sourceMode}`}
          aria-label={sourceMode === "live" ? "Data from backend services" : "Demonstration data only"}
        >
          {sourceMode === "live" ? "Live" : "Demo"}
        </span>
      </div>
      {children}
    </div>
  );
}

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
  const [openAlertsCount, setOpenAlertsCount] = useState(0);
  const [commandErrorKpi, setCommandErrorKpi] = useState<{ value: string; trend: string }>({
    value: "—",
    trend: USE_LIVE_MISSION_DATA ? "loading" : "simulated",
  });
  const [operatorRole, setOperatorRole] = useState<"analyst" | "commander">("analyst");

  useEffect(() => {
    const controller = new AbortController();

    const pollHealthAndMaybeLive = async () => {
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

      if (!USE_LIVE_MISSION_DATA) return;

      try {
        const [alertsRows, obs] = await Promise.all([
          fetchOpenAlerts(COMMAND_BASE, controller.signal),
          fetchObservabilitySummary(COMMAND_BASE, controller.signal),
        ]);

        const sorted = [...alertsRows].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setMissionEvents(sorted.map(alertToMissionEvent).slice(0, 8));
        setAlerts(sorted.slice(0, 10).map(commandAlertToAlertItem));
        setOpenAlertsCount(alertsRows.length);

        if (!obs.metricsEnabled) {
          setCommandErrorKpi({
            value: "—",
            trend: "metrics disabled on command service",
          });
        } else if (obs.command.httpErrorSharePercent === null) {
          setCommandErrorKpi({
            value: "—",
            trend: "warming up (needs 2 polls)",
          });
        } else {
          setCommandErrorKpi({
            value: `${obs.command.httpErrorSharePercent}%`,
            trend: `command HTTP 5xx share · +${obs.command.requestsInWindow ?? 0} req in window`,
          });
        }
      } catch {
        setMissionEvents([]);
        setAlerts([]);
        setOpenAlertsCount(0);
        setCommandErrorKpi({ value: "—", trend: "live data unreachable" });
      }
    };

    pollHealthAndMaybeLive();
    const timer = window.setInterval(pollHealthAndMaybeLive, POLL_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (USE_LIVE_MISSION_DATA) return;

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
        setAlerts((prev) =>
          [
            {
              id: event.id,
              severity: mappedSeverity,
              title: event.summary,
              source: event.zone,
              at: event.timestamp,
            },
            ...prev,
          ].slice(0, 10)
        );
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

    const base = [
      {
        label: "Services Healthy",
        value: `${healthy}/${serviceStatuses.length}`,
        trend: "live · poll 3.5s",
        source: "live" as const,
      },
      {
        label: "Avg Health Latency",
        value: `${avgLatency} ms`,
        trend: "live · poll 3.5s",
        source: "live" as const,
      },
    ];

    if (USE_LIVE_MISSION_DATA) {
      return [
        ...base,
        {
          label: "Open alerts",
          value: String(openAlertsCount),
          trend: "live · unacknowledged (max 200 fetched)",
          source: "live" as const,
        },
        {
          label: "Command HTTP error share",
          value: commandErrorKpi.value,
          trend: commandErrorKpi.trend,
          source: "live" as const,
        },
      ];
    }

    return [
      ...base,
      {
        label: "Queue Backlog",
        value: String(queueDepth),
        trend: "demo · simulated counters",
        source: "demo" as const,
      },
      {
        label: "Error Rate",
        value: `${errorRate}%`,
        trend: "demo · simulated rolling %",
        source: "demo" as const,
      },
    ];
  }, [serviceStatuses, queueDepth, errorRate, openAlertsCount, commandErrorKpi]);

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">A4 Mission Operations Console</p>
          <h1>Commander Operational Picture</h1>
          <p className="lede">
            Hybrid console: service health is always polled from the stack. Mission timeline, alerts, and the backlog /
            error KPIs use either{" "}
            <strong>{USE_LIVE_MISSION_DATA ? "live command-service data" : "frontend simulation"}</strong> (toggle
            with <code className="env-hint">VITE_USE_LIVE_MISSION_DATA</code> at build time).
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
            <p className={`kpi-source kpi-source-${kpi.source}`}>
              <span className="sr-only">Data source: </span>
              {kpi.source === "live" ? "Live" : "Demo"}
            </p>
          </article>
        ))}
      </section>

      <section className="grid">
        <article className="panel" aria-labelledby="serviceHealthHeading">
          <PanelHeader titleId="serviceHealthHeading" title="Service Health" sourceMode="live">
            <span className="updatedAt" role="status" aria-live="polite">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          </PanelHeader>
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
          <PanelHeader
            titleId="timelineHeading"
            title="Mission Timeline"
            sourceMode={USE_LIVE_MISSION_DATA ? "live" : "demo"}
          >
            <span className="legend">
              {USE_LIVE_MISSION_DATA
                ? "Recent rows from GET /alerts (unacknowledged)"
                : "Random scenario events (frontend only · not metrics or RabbitMQ)"}
            </span>
          </PanelHeader>
          <ul className="timeline">
            {missionEvents.length === 0 && (
              <li className="empty">
                {USE_LIVE_MISSION_DATA ? "No unacknowledged alerts in view." : "Awaiting mission stream..."}
              </li>
            )}
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
          <PanelHeader
            titleId="alertHeading"
            title="Priority Alerts"
            sourceMode={USE_LIVE_MISSION_DATA ? "live" : "demo"}
          >
            <span className="legend">
              {USE_LIVE_MISSION_DATA
                ? "Live unacknowledged alerts from command service"
                : `${operatorRole === "commander" ? "Commander escalation queue" : "Analyst triage queue"} (simulated)`}
            </span>
          </PanelHeader>
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
          <PanelHeader titleId="missionCardsHeading" title="Mission Cards" sourceMode="demo">
            <span className="legend">Static scenario copy for UX context (not from APIs)</span>
          </PanelHeader>
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
          <strong>Live:</strong> health checks against command and sensor bases; with{" "}
          <code className="env-hint">VITE_USE_LIVE_MISSION_DATA=true</code>, also GET <code>/alerts</code>,{" "}
          <code>/observability/summary</code> on the command service.
        </p>
        <p>
          <strong>Demo / simulated:</strong> mission cards; and when live mode is off, the mission timeline, priority
          alerts, queue backlog KPI, and error-rate KPI are driven by <code>simulation.ts</code> (random local state),
          not Postgres, logs, or RabbitMQ depth.
        </p>
      </footer>
    </main>
  );
}
