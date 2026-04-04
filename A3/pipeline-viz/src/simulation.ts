/** Stages aligned with A3 sensor-to-C2 pipeline plan. */
export const STAGE_LABELS = [
  "Ingest",
  "Validate",
  "Normalize",
  "Analyze",
  "Persist",
  "Alert",
] as const;

export type StageIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type Mode = "blocking" | "reactive";

export type InFlight = {
  eventId: number;
  stage: StageIndex;
  /** Remaining ms for current stage (may go negative before carry is applied) */
  remainingMs: number;
};

export type SimState = {
  mode: Mode;
  maxInFlight: number;
  queue: number[];
  inFlight: InFlight[];
  completed: number;
  totalEvents: number;
  elapsedMs: number;
  stageDurations: number[];
};

const LAST_STAGE: StageIndex = 5;

function nextIdFromQueue(queue: number[]): { queue: number[]; id: number | null } {
  if (queue.length === 0) return { queue, id: null };
  const [head, ...rest] = queue;
  return { queue: rest, id: head };
}

export function createInitialState(
  mode: Mode,
  totalEvents: number,
  maxInFlight: number,
  stageDurations: number[]
): SimState {
  const ids = Array.from({ length: totalEvents }, (_, i) => i + 1);
  const queue = [...ids];
  const cap = mode === "blocking" ? 1 : Math.max(1, maxInFlight);
  const inFlight: InFlight[] = [];
  let q = queue;
  while (inFlight.length < cap) {
    const n = nextIdFromQueue(q);
    q = n.queue;
    if (n.id === null) break;
    inFlight.push({
      eventId: n.id,
      stage: 0,
      remainingMs: stageDurations[0],
    });
  }
  return {
    mode,
    maxInFlight: cap,
    queue: q,
    inFlight,
    completed: 0,
    totalEvents,
    elapsedMs: 0,
    stageDurations,
  };
}

/** Carry negative/zero remaining time through stages (may complete in one tick). */
function carryThroughStage(
  ev: InFlight,
  durations: number[]
): "continue" | "done" {
  while (ev.remainingMs <= 0) {
    if (ev.stage < LAST_STAGE) {
      ev.stage = (ev.stage + 1) as StageIndex;
      ev.remainingMs += durations[ev.stage];
    } else {
      return "done";
    }
  }
  return "continue";
}

export function tick(state: SimState, deltaMs: number): SimState {
  const stageDurations = state.stageDurations;
  let queue = [...state.queue];
  let inFlight = state.inFlight.map((e) => ({ ...e }));
  let completed = state.completed;
  const cap = state.maxInFlight;

  for (const ev of inFlight) {
    ev.remainingMs -= deltaMs;
  }

  let progress = true;
  while (progress) {
    progress = false;

    const completions = inFlight.filter((e) => e.remainingMs <= 0);
    if (completions.length === 0) break;

    completions.sort((a, b) => a.eventId - b.eventId);
    const ev = completions[0];
    const idx = inFlight.findIndex((x) => x.eventId === ev.eventId);
    if (idx < 0) break;

    const outcome = carryThroughStage(ev, stageDurations);
    if (outcome === "done") {
      completed += 1;
      inFlight.splice(idx, 1);
      const n = nextIdFromQueue(queue);
      queue = n.queue;
      if (n.id !== null && inFlight.length < cap) {
        inFlight.push({
          eventId: n.id,
          stage: 0,
          remainingMs: stageDurations[0],
        });
      }
      progress = true;
      continue;
    }

    progress = true;
  }

  while (inFlight.length < cap) {
    const n = nextIdFromQueue(queue);
    queue = n.queue;
    if (n.id === null) break;
    inFlight.push({
      eventId: n.id,
      stage: 0,
      remainingMs: stageDurations[0],
    });
  }

  return {
    ...state,
    queue,
    inFlight,
    completed,
    elapsedMs: state.elapsedMs + deltaMs,
  };
}

export function isFinished(state: SimState): boolean {
  return state.queue.length === 0 && state.inFlight.length === 0;
}
