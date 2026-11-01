import type { PresenceCounts } from "./protocol";
import { countsFromValues, presenceKey, PRESENCE_KEY_TTL_SECONDS, type PresenceStore } from "./store";

export type UpstashConfig = {
  /** REST URL of the database, e.g. https://<name>.upstash.io */
  url: string;
  token: string;
};

type UpstashOptions = {
  fetch?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
  warn?: (message: string) => void;
};

const TIMEOUT_MS = 2_500;
// Every open tab pings twice a minute; one failing database must not flood the function logs.
const WARN_INTERVAL_MS = 60_000;

/** The one pipeline per ping: count it, let the counter expire, read the previous window. */
export function upstashPipeline(station: string, window: number, stationIds: readonly string[]): string[][] {
  const key = presenceKey(station, window);
  return [
    ["INCR", key],
    ["EXPIRE", key, String(PRESENCE_KEY_TTL_SECONDS)],
    ["MGET", ...stationIds.map((id) => presenceKey(id, window - 1))],
  ];
}

/** Counts from a pipeline response; null unless all three commands succeeded. */
export function countsFromPipelineResponse(body: unknown, stationIds: readonly string[]): PresenceCounts | null {
  if (!Array.isArray(body) || body.length !== 3) return null;
  if (!body.every((entry) => isRecord(entry) && "result" in entry && entry.error === undefined)) return null;
  const values: unknown = body[2].result;
  if (!Array.isArray(values) || values.length !== stationIds.length) return null;
  return countsFromValues(stationIds, values);
}

/** Upstash Redis over its REST pipeline endpoint, with plain fetch. */
export function createUpstashStore(config: UpstashConfig, options: UpstashOptions = {}): PresenceStore {
  const endpoint = `${config.url.replace(/\/+$/, "")}/pipeline`;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const warn = options.warn ?? ((message: string) => console.warn(message));
  let lastWarnAt = Number.NEGATIVE_INFINITY;

  // Only says what went wrong, never the request: its headers carry the token.
  function fail(reason: string): null {
    const nowMs = now();
    if (nowMs - lastWarnAt >= WARN_INTERVAL_MS) {
      lastWarnAt = nowMs;
      warn(`[presence] Redis request failed: ${reason}`);
    }
    return null;
  }

  return {
    async ping(station, window, stationIds) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const fetchImpl = options.fetch ?? fetch;
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(upstashPipeline(station, window, stationIds)),
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return fail(`HTTP ${response.status}`);
        const counts = countsFromPipelineResponse(await response.json(), stationIds);
        return counts ?? fail("unexpected response");
      } catch (error) {
        return fail(controller.signal.aborted ? `timeout after ${timeoutMs} ms` : errorName(error));
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Name and system error code only (e.g. "TypeError (ENOTFOUND)"): messages may quote the request.
function errorName(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const code = isRecord(error.cause) ? error.cause.code : undefined;
  return typeof code === "string" ? `${error.name} (${code})` : error.name;
}
