import { countsFromValues, presenceKey, PRESENCE_KEY_TTL_SECONDS, type PresenceStore } from "./store";

type Entry = { count: number; expiresAt: number };

/**
 * Process-local counters for `next dev` / `next start` without Redis. Mirrors the Redis store:
 * each ping refreshes its counter's expiry, expired counters are gone.
 */
export function createMemoryStore(options: { now?: () => number } = {}): PresenceStore {
  const now = options.now ?? Date.now;
  const ttlMs = PRESENCE_KEY_TTL_SECONDS * 1_000;
  const entries = new Map<string, Entry>();

  return {
    async ping(station, window, stationIds) {
      const nowMs = now();
      for (const [key, entry] of entries) if (entry.expiresAt <= nowMs) entries.delete(key);

      const key = presenceKey(station, window);
      entries.set(key, { count: (entries.get(key)?.count ?? 0) + 1, expiresAt: nowMs + ttlMs });

      const previous = stationIds.map((id) => entries.get(presenceKey(id, window - 1))?.count ?? null);
      return countsFromValues(stationIds, previous);
    },
  };
}
