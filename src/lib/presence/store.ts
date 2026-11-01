import type { PresenceCounts } from "./protocol";

/**
 * Where pings are counted. One counter per station and window, nothing else: no tab, address or
 * client ever becomes part of a key.
 */
export interface PresenceStore {
  /**
   * Counts one ping for `station` in `window` and returns the counts of the previous (complete)
   * window for every id in `stationIds`. Null when the store failed; never throws.
   */
  ping(station: string, window: number, stationIds: readonly string[]): Promise<PresenceCounts | null>;
}

/** A counter must outlive its own window plus the next one, in which it is read. */
export const PRESENCE_KEY_TTL_SECONDS = 120;

export function presenceKey(station: string, window: number): string {
  return `np:presence:${station}:${window}`;
}

/**
 * Counts per station from raw counter values in `stationIds` order (Redis MGET gives strings,
 * or null for a key nobody pinged). Anything that isn't a non-negative integer counts as 0.
 */
export function countsFromValues(stationIds: readonly string[], values: readonly unknown[]): PresenceCounts {
  const stations: Record<string, number> = {};
  let total = 0;
  stationIds.forEach((id, index) => {
    const count = toCount(values[index]);
    stations[id] = count;
    total += count;
  });
  return { total, stations };
}

function toCount(value: unknown): number {
  const count = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof count === "number" && Number.isSafeInteger(count) && count > 0 ? count : 0;
}
