export type MissionEvent = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  zone: string;
  summary: string;
  timestamp: string;
};

type MissionCard = {
  id: string;
  title: string;
  description: string;
  objective: string;
  window: string;
};

const zones = ["North Sector", "Delta Ridge", "Harbor Gate", "Urban Grid", "Logistics Corridor"];
const summaries = [
  "Thermal variance exceeds baseline threshold",
  "Motion cluster detected in restricted lane",
  "Telemetry gap from edge relay",
  "High-confidence anomaly in ingress pattern",
  "Unacknowledged command queue increase",
];

const severities: MissionEvent["severity"][] = ["low", "medium", "high", "critical"];

export const missionCards: MissionCard[] = [
  {
    id: "mission-alpha",
    title: "Mission Alpha",
    description: "Monitor perimeter movement and correlate sensor variance with command backlog.",
    objective: "Prevent unauthorized ingress while maintaining service reliability.",
    window: "0600-1000 Zulu",
  },
  {
    id: "mission-bravo",
    title: "Mission Bravo",
    description: "Track infrastructure health and identify degraded service paths in real time.",
    objective: "Sustain command latency below p90 target under mixed load.",
    window: "1000-1400 Zulu",
  },
  {
    id: "mission-charlie",
    title: "Mission Charlie",
    description: "Stress event intake while preserving controlled degradation behavior.",
    objective: "Validate overload strategy and analyst alert triage flow.",
    window: "1400-1800 Zulu",
  },
];

export function buildMissionEvent(): MissionEvent {
  const severity = severities[Math.floor(Math.random() * severities.length)];
  const zone = zones[Math.floor(Math.random() * zones.length)];
  const summary = summaries[Math.floor(Math.random() * summaries.length)];
  return {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    severity,
    zone,
    summary,
    timestamp: new Date().toISOString(),
  };
}
