import { PRESENCE_WINDOW_MS, presenceWindow, type PresenceCounts } from "@/lib/presence/protocol";

/**
 * Pings keep this far from both edges of a window, so a server clock a little off from ours
 * still counts each ping in the window it was meant for (never twice in one window).
 */
export const PING_EDGE_MS = 2_000;
/** Regular pings land at a random moment this far into their window, which spreads the load. */
export const PING_JITTER_MIN_MS = PING_EDGE_MS;
export const PING_JITTER_MAX_MS = 20_000;

export type PingPlan = {
  /** The counting window this ping belongs to */
  window: number;
  /** Station time to send it at; at or before "now" means right away */
  at: number;
};

/** Jitter for one window from a random number in [0, 1). */
export function pingJitterMs(random: number): number {
  const unit = Number.isFinite(random) ? Math.min(Math.max(random, 0), 1) : 0;
  return PING_JITTER_MIN_MS + unit * (PING_JITTER_MAX_MS - PING_JITTER_MIN_MS);
}

function windowStart(window: number): number {
  return window * PRESENCE_WINDOW_MS;
}

/**
 * The next ping of a visible tab. A window it hasn't pinged yet is pinged right away (as soon as
 * the edge margin allows); once pinged, the next one is due `jitterMs` into the following window.
 * A window that is too close to its end to be pinged safely is left out.
 */
export function planPing(now: number, lastPinged: number | null, jitterMs: number): PingPlan {
  const current = presenceWindow(now);
  if (lastPinged === null || lastPinged < current) {
    const at = Math.max(now, windowStart(current) + PING_EDGE_MS);
    if (at <= windowStart(current + 1) - PING_EDGE_MS) return { window: current, at };
    return { window: current + 1, at: windowStart(current + 1) + jitterMs };
  }
  // Already pinged this window (or a later one, should the clock have stepped back).
  const next = lastPinged + 1;
  return { window: next, at: windowStart(next) + jitterMs };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Counts from a POST /api/presence body: null when the server has counting switched off,
 * undefined when the body isn't a valid answer (keep showing the last good counts).
 */
export function parsePresenceResponse(body: unknown): PresenceCounts | null | undefined {
  if (typeof body !== "object" || body === null || !("counts" in body)) return undefined;
  const { counts } = body as { counts: unknown };
  if (counts === null) return null;
  if (typeof counts !== "object") return undefined;
  const { total, stations } = counts as { total?: unknown; stations?: unknown };
  if (!isCount(total) || typeof stations !== "object" || stations === null || Array.isArray(stations)) {
    return undefined;
  }
  const perStation: Record<string, number> = {};
  for (const [id, count] of Object.entries(stations)) {
    if (!isCount(count)) return undefined;
    perStation[id] = count;
  }
  return { total, stations: perStation };
}
