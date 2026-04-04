import { useCallback, useEffect, useMemo, useState } from "react";
import {
  STAGE_LABELS,
  createInitialState,
  isFinished,
  tick,
  type Mode,
  type SimState,
} from "./simulation";
import "./App.css";

const DEFAULT_DURATIONS = [180, 120, 120, 160, 1400, 100];

export default function App() {
  const [mode, setMode] = useState<Mode>("blocking");
  const [maxInFlight, setMaxInFlight] = useState(3);
  const [totalEvents, setTotalEvents] = useState(10);
  const [persistMs, setPersistMs] = useState(1400);
  const [running, setRunning] = useState(true);

  const stageDurations = useMemo(() => {
    const d = [...DEFAULT_DURATIONS];
    d[4] = Math.max(50, persistMs);
    return d;
  }, [persistMs]);

  const [state, setState] = useState<SimState>(() =>
    createInitialState("blocking", 10, 3, stageDurations)
  );

  const reset = useCallback(() => {
    setState(createInitialState(mode, totalEvents, maxInFlight, stageDurations));
  }, [mode, totalEvents, maxInFlight, stageDurations]);

  useEffect(() => {
    reset();
  }, [mode, totalEvents, maxInFlight, stageDurations, reset]);

  useEffect(() => {
    if (!running) {
      return;
    }
    let raf = 0;
    let last = performance.now();
    const loop = (ts: number) => {
      const delta = Math.min(100, Math.max(0, ts - last));
      last = ts;
      setState((s) => {
        if (isFinished(s)) return s;
        return tick(s, delta);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const throughput =
    state.elapsedMs > 0 ? (state.completed / state.elapsedMs) * 1000 : 0;

  const queuePreview = state.queue.slice(0, 12);

  return (
    <div className="app">
      <header className="header">
        <h1>Sensor → C2 pipeline: blocking vs reactive</h1>
        <p className="lede">
          Same stages as the A3 plan: Ingest → Validate → Normalize → Analyze →
          Persist → Alert. When <strong>Persist</strong> is slow, reactive mode
          overlaps DB waits by allowing up to <em>N</em> events in-flight so
          other work continues.
        </p>
      </header>

      <section className="controls" aria-label="Simulation controls">
        <div className="control-row">
          <label>
            Mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="blocking">Blocking (one event end-to-end)</option>
              <option value="reactive">
                Reactive (bounded concurrency + overlapping I/O)
              </option>
            </select>
          </label>
          <label>
            Max in-flight (N)
            <input
              type="number"
              min={1}
              max={12}
              disabled={mode === "blocking"}
              value={mode === "blocking" ? 1 : maxInFlight}
              onChange={(e) => setMaxInFlight(Number(e.target.value))}
            />
          </label>
          <label>
            Events in run
            <input
              type="number"
              min={1}
              max={80}
              value={totalEvents}
              onChange={(e) => setTotalEvents(Number(e.target.value))}
            />
          </label>
          <label>
            Persist duration (ms)
            <input
              type="number"
              min={50}
              max={8000}
              step={50}
              value={persistMs}
              onChange={(e) => setPersistMs(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="buttons">
          <button type="button" onClick={reset}>
            Reset run
          </button>
          <button type="button" onClick={() => setRunning((r) => !r)}>
            {running ? "Pause" : "Resume"}
          </button>
        </div>
      </section>

      <section className="metrics" aria-live="polite">
        <div>
          <span className="metric-label">Completed</span>
          <span className="metric-value">
            {state.completed} / {state.totalEvents}
          </span>
        </div>
        <div>
          <span className="metric-label">Elapsed (sim)</span>
          <span className="metric-value">
            {(state.elapsedMs / 1000).toFixed(1)} s
          </span>
        </div>
        <div>
          <span className="metric-label">Throughput</span>
          <span className="metric-value">
            {throughput.toFixed(2)} events/s
          </span>
        </div>
      </section>

      <div className="pipeline-wrap">
        <div className="queue-col" aria-label="Queued events">
          <h2>Queue</h2>
          <ul className="queue-list">
            {queuePreview.map((id) => (
              <li key={id}>E{id}</li>
            ))}
            {state.queue.length > 12 && (
              <li className="more">+{state.queue.length - 12} …</li>
            )}
            {state.queue.length === 0 && (
              <li className="empty">—</li>
            )}
          </ul>
        </div>

        <div className="stages-grid" role="table" aria-label="Pipeline stages">
          <div className="stages-header" role="row">
            {STAGE_LABELS.map((label) => (
              <div
                key={label}
                className={`stage-head ${label === "Persist" ? "persist" : ""}`}
                role="columnheader"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="stages-body" role="rowgroup">
            {STAGE_LABELS.map((_, col) => (
              <div key={col} className="stage-cell" role="cell">
                {state.inFlight
                  .filter((e) => e.stage === col)
                  .map((e) => {
                    const dur = stageDurations[col];
                    const pct = dur > 0 ? (1 - e.remainingMs / dur) * 100 : 100;
                    const clamped = Math.min(100, Math.max(0, pct));
                    return (
                      <div
                        key={e.eventId}
                        className={`token ${
                          STAGE_LABELS[col] === "Persist" ? "persist" : ""
                        }`}
                      >
                        <span className="token-id">E{e.eventId}</span>
                        <span
                          className="token-bar"
                          style={{ width: `${clamped}%` }}
                          aria-hidden
                        />
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="hint">
        In <strong>blocking</strong> mode, only one token appears across the
        pipeline at a time. In <strong>reactive</strong> mode, multiple tokens can
        sit in different stages (especially while one is in Persist), which
        raises completed events per second when Persist dominates.
      </p>
    </div>
  );
}
