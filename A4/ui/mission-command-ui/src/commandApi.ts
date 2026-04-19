export type CommandAlert = {
  alert_id: string;
  sensor_id: string;
  alert_type: string;
  severity: string;
  message: string;
  acknowledged: boolean;
  created_at: string;
};

export type ObservabilitySummary = {
  metricsEnabled: boolean;
  command: {
    httpErrorSharePercent: number | null;
    requestsInWindow: number | null;
    errors5xxInWindow: number | null;
  };
};

const correlationHeader = () => ({
  "X-Correlation-ID": `a4-ui-${Date.now()}`,
});

export async function fetchOpenAlerts(commandBase: string, signal?: AbortSignal): Promise<CommandAlert[]> {
  const url = `${commandBase.replace(/\/$/, "")}/alerts?acknowledged=false&limit=200`;
  const resp = await fetch(url, { signal, headers: correlationHeader() });
  if (!resp.ok) {
    throw new Error(`alerts HTTP ${resp.status}`);
  }
  const body = (await resp.json()) as { data?: CommandAlert[] };
  return body.data ?? [];
}

export async function fetchObservabilitySummary(
  commandBase: string,
  signal?: AbortSignal
): Promise<ObservabilitySummary> {
  const url = `${commandBase.replace(/\/$/, "")}/observability/summary`;
  const resp = await fetch(url, { signal, headers: correlationHeader() });
  if (!resp.ok) {
    throw new Error(`observability summary HTTP ${resp.status}`);
  }
  return (await resp.json()) as ObservabilitySummary;
}
