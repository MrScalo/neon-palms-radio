import { STATIONS } from "@/config/stations";
import type { Slot, Station, Track } from "./types";

/**
 * The network's shared schedules. Every visitor computes the same programme for each station
 * from the same tracks and the same (server-synced) clock, so no backend state is needed.
 * Pure module: time is always passed in.
 */

export const STATION_EPOCH_MS: number = Date.UTC(2026, 0, 1);

/** Bump whenever the shuffle or slot algorithm changes, so open tabs learn they compute an outdated programme. */
export const SCHEDULE_VERSION = 2;

const CACHE_SIZE = 6;
const SLOT_CACHE_SIZE = 16;

type CycleOrder = {
  tracks: readonly Track[];
  /** offsets[i] = ms from cycle start to track i; offsets[length] = cycle length */
  offsets: readonly number[];
};

type Prepared = {
  stationId: string;
  tracks: readonly Track[];
  /** Mixed into every cycle seed so each station shuffles differently. */
  stationHash: number;
  cycleMs: number;
  shuffles: Lru<number, readonly Track[]>;
  orders: Lru<number, CycleOrder>;
  slots: Lru<string, Slot>;
};

class Lru<K, V> {
  private readonly map = new Map<K, V>();
  constructor(private readonly max: number) {}

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): V {
    this.map.set(key, value);
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next();
      if (!oldest.done) this.map.delete(oldest.value);
    }
    return value;
  }
}

const preparedByStation = new Map<string, Prepared>();

function prepare(station: Station): Prepared {
  const { id, tracks } = station;
  const cached = preparedByStation.get(id);
  // Same id with another track list (tests, hot reload): the old caches no longer apply.
  if (cached && cached.tracks === tracks) return cached;

  if (tracks.length === 0) {
    throw new Error(
      `Neon Palms Radio: station "${id}" has no tracks — add at least one to src/data/stations/${id}.json.`,
    );
  }
  let cycleMs = 0;
  for (const track of tracks) {
    if (!Number.isInteger(track.duration) || track.duration <= 0) {
      throw new Error(
        `Neon Palms Radio: station "${id}": track "${track.id}" has an invalid duration (${track.duration}); ` +
          "expected a positive whole number of seconds.",
      );
    }
    cycleMs += track.duration * 1000;
  }

  const prepared: Prepared = {
    stationId: id,
    tracks,
    stationHash: hashText(id),
    cycleMs,
    shuffles: new Lru(CACHE_SIZE),
    orders: new Lru(CACHE_SIZE),
    slots: new Lru(SLOT_CACHE_SIZE),
  };
  preparedByStation.set(id, prepared);
  return prepared;
}

function assertCycle(cycle: number): void {
  if (!Number.isSafeInteger(cycle)) {
    throw new RangeError(`Neon Palms Radio: cycle must be a safe integer, got ${cycle}.`);
  }
}

function assertTime(stationNowMs: number): void {
  if (!Number.isFinite(stationNowMs)) {
    throw new RangeError(`Neon Palms Radio: station time must be a finite number, got ${stationNowMs}.`);
  }
}

// --- Deterministic randomness -------------------------------------------------------------
// Only 32-bit integer ops (Math.imul, shifts) and exact divisions, so every JS engine
// produces bit-identical results.

/** FNV-1a over UTF-16 code units, 32 bit unsigned. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A well-mixed 32-bit hash of a station id. */
function hashText(text: string): number {
  let h = fnv1a(text);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Mixes any safe integer cycle (including negatives) and a station hash into a 32-bit seed. */
function cycleSeed(stationHash: number, cycle: number): number {
  const hi = Math.floor(cycle / 0x1_0000_0000);
  const lo = cycle - hi * 0x1_0000_0000;
  let h = (lo ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h ^ (hi | 0) ^ 0x27d4eb2f, 0x165667b1);
  h ^= h >>> 15;
  // The station goes in after the cycle is fully mixed, so neighbouring cycles of different
  // stations don't line up.
  h = Math.imul(h ^ stationHash, 0x9e3779b1);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

function shuffled(prepared: Prepared, cycle: number): readonly Track[] {
  const cached = prepared.shuffles.get(cycle);
  if (cached) return cached;
  const random = mulberry32(cycleSeed(prepared.stationHash, cycle));
  const result = prepared.tracks.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return prepared.shuffles.set(cycle, result);
}

// --- Artist spacing ----------------------------------------------------------------------

function artistKey(track: Track): string {
  // toLowerCase (not toLocaleLowerCase) is locale-independent.
  return track.artist.trim().toLowerCase();
}

/**
 * Can `m` remaining tracks (artist counts in `counts`) be placed between neighbours `left`
 * and `right` without two equal artists touching? An artist excluded from k usable
 * positions on a path fits at most ceil(k / 2) times; checked against brute force.
 */
function canSpace(counts: ReadonlyMap<string, number>, m: number, left: string | null, right: string | null): boolean {
  if (m === 0) return left === null || right === null || left !== right;
  for (const [artist, count] of counts) {
    if (count === 0) continue;
    const usable = m - (artist === left ? 1 : 0) - (artist === right ? 1 : 0);
    const cap = usable <= 0 ? 0 : Math.ceil(usable / 2);
    if (count > cap) return false;
  }
  return true;
}

/**
 * Reorders `items` (kept in shuffled order as far as possible) so no artist plays twice in a
 * row, given the artist that plays before (`left`) and after (`right`) the block.
 * When that is impossible it still minimises repeats by placing the most frequent artist first.
 */
function spaceArtists(items: readonly Track[], left: string | null, right: string | null): Track[] {
  const counts = new Map<string, number>();
  for (const track of items) {
    const key = artistKey(track);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const bump = (key: string, delta: number) => counts.set(key, (counts.get(key) ?? 0) + delta);

  const remaining = items.slice();
  const result: Track[] = [];
  let previous = left;

  while (remaining.length > 0) {
    let pick = -1;
    for (let i = 0; i < remaining.length; i++) {
      const key = artistKey(remaining[i]);
      if (key === previous) continue;
      bump(key, -1);
      const ok = canSpace(counts, remaining.length - 1, key, right);
      bump(key, 1);
      if (ok) {
        pick = i;
        break;
      }
    }
    if (pick === -1) {
      let bestCount = -1;
      for (let i = 0; i < remaining.length; i++) {
        const key = artistKey(remaining[i]);
        const count = counts.get(key) ?? 0;
        if (key !== previous && count > bestCount) {
          bestCount = count;
          pick = i;
        }
      }
      if (pick === -1) pick = 0;
    }
    const [track] = remaining.splice(pick, 1);
    const key = artistKey(track);
    bump(key, -1);
    result.push(track);
    previous = key;
  }
  return result;
}

// --- Cycle order -------------------------------------------------------------------------

/**
 * The last track of each cycle is pinned to the last element of that cycle's raw shuffle.
 * That makes the boundary neighbour of cycle n (the tail of cycle n-1) computable from
 * cycle n-1's shuffle alone, so no cycle's order ever depends recursively on another's.
 */
function orderFor(prepared: Prepared, cycle: number): CycleOrder {
  const cached = prepared.orders.get(cycle);
  if (cached) return cached;

  const raw = shuffled(prepared, cycle);
  let ordered: readonly Track[] = raw;
  if (raw.length > 2) {
    const tail = raw[raw.length - 1];
    const previousTail = shuffled(prepared, cycle - 1)[raw.length - 1];
    const head = spaceArtists(raw.slice(0, -1), artistKey(previousTail), artistKey(tail));
    ordered = [...head, tail];
  }

  const offsets: number[] = [0];
  for (const track of ordered) offsets.push(offsets[offsets.length - 1] + track.duration * 1000);

  return prepared.orders.set(cycle, { tracks: ordered, offsets });
}

/** The play order of a station's rotation cycle: every track exactly once, deterministic in every browser. */
export function cycleOrder(cycle: number, station: Station): Track[] {
  assertCycle(cycle);
  return orderFor(prepare(station), cycle).tracks.slice();
}

// --- Slots -------------------------------------------------------------------------------

/** Slots are cached and frozen so the same airing keeps the same object identity. */
function slotFor(prepared: Prepared, cycle: number, index: number): Slot {
  const key = `${cycle}:${index}`;
  const cached = prepared.slots.get(key);
  if (cached) return cached;

  const order = orderFor(prepared, cycle);
  const track = order.tracks[index];
  const startsAt = STATION_EPOCH_MS + cycle * prepared.cycleMs + order.offsets[index];
  const slot: Slot = Object.freeze({
    stationId: prepared.stationId,
    track,
    cycle,
    index,
    startsAt,
    endsAt: startsAt + track.duration * 1000,
  });
  return prepared.slots.set(key, slot);
}

/** The slot on air on `station` at `stationNowMs`. Boundaries are half-open: at exactly `endsAt` the next slot is current. */
export function getSlotAt(stationNowMs: number, station: Station): Slot {
  assertTime(stationNowMs);
  const prepared = prepare(station);
  const { cycleMs } = prepared;

  const sinceEpoch = stationNowMs - STATION_EPOCH_MS;
  let cycle = Math.floor(sinceEpoch / cycleMs);
  let position = sinceEpoch - cycle * cycleMs;
  // Guard against floating-point rounding right at a cycle boundary.
  if (position < 0) {
    cycle -= 1;
    position += cycleMs;
  } else if (position >= cycleMs) {
    cycle += 1;
    position -= cycleMs;
  }

  const { offsets } = orderFor(prepared, cycle);
  // Largest index whose start offset is <= position.
  let low = 0;
  let high = offsets.length - 2;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (offsets[mid] <= position) low = mid;
    else high = mid - 1;
  }
  return slotFor(prepared, cycle, low);
}

/** The next `count` slots on `station` after the one on air at `stationNowMs`, crossing cycle boundaries. */
export function getUpcoming(stationNowMs: number, count: number, station: Station): Slot[] {
  const prepared = prepare(station);
  const upcoming: Slot[] = [];
  let { cycle, index } = getSlotAt(stationNowMs, station);
  for (let i = 0; i < count; i++) {
    index += 1;
    if (index >= prepared.tracks.length) {
      cycle += 1;
      index = 0;
    }
    upcoming.push(slotFor(prepared, cycle, index));
  }
  return upcoming;
}

let lastOnAir: ReadonlyMap<string, Slot> | null = null;

/**
 * The slot on air on every station, by station id. Returns the previous map as long as no
 * station's song has changed, so it can be compared by reference.
 */
export function getOnAir(stationNowMs: number, stations: readonly Station[]): ReadonlyMap<string, Slot> {
  const slots = stations.map((station) => getSlotAt(stationNowMs, station));
  const previous = lastOnAir;
  const unchanged =
    previous !== null && previous.size === slots.length && slots.every((slot) => previous.get(slot.stationId) === slot);
  if (unchanged) return previous;
  lastOnAir = new Map(slots.map((slot) => [slot.stationId, slot]));
  return lastOnAir;
}

// --- Fingerprint -------------------------------------------------------------------------

/** Identifies the programmes computed for `stations`: everything their slots depend on goes in. */
export function scheduleFingerprint(stations: readonly Station[]): string {
  const programme = stations
    .map(({ id, tracks }) => `${id}=${tracks.map((t) => `${t.id}:${t.duration}:${artistKey(t)}`).join(",")}`)
    .join(";");
  return fnv1a(`${SCHEDULE_VERSION}|${STATION_EPOCH_MS}|${programme}`).toString(16).padStart(8, "0");
}

/** The programmes this build airs. The server reports its own via /api/time so outdated tabs notice. */
export const SCHEDULE_FINGERPRINT: string = scheduleFingerprint(STATIONS);

/** Fractional seconds since the slot started, clamped to [0, duration]. */
export function liveOffsetSeconds(slot: Slot, stationNowMs: number): number {
  const duration = (slot.endsAt - slot.startsAt) / 1000;
  const offset = (stationNowMs - slot.startsAt) / 1000;
  if (!(offset > 0)) return 0;
  return offset > duration ? duration : offset;
}
