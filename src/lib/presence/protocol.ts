/**
 * Listener count without identifiers: every open, visible tab sends one ping per window
 * ("I'm on station X"); the count of a station is the number of pings in the last complete
 * window. Nothing identifies a tab, so nothing is stored about anyone.
 */

/** Length of one counting window. Tabs ping once per window, aligned to the station clock. */
export const PRESENCE_WINDOW_MS = 30_000;

/** POST /api/presence */
export type PresencePing = {
  /** Station id the tab is tuned to (must exist in STATIONS) */
  station: string;
};

export type PresenceCounts = {
  total: number;
  /** Count per station id; every station is present, 0 when nobody is there */
  stations: Record<string, number>;
};

/** Response of POST /api/presence. `counts` is null when counting is switched off (no store configured). */
export type PresenceResponse = {
  counts: PresenceCounts | null;
};

/** Index of the counting window that contains `timeMs`. */
export function presenceWindow(timeMs: number): number {
  return Math.floor(timeMs / PRESENCE_WINDOW_MS);
}
