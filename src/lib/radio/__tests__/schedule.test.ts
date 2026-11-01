import { describe, expect, it } from "vitest";
import {
  PLAYLIST,
  SCHEDULE_FINGERPRINT,
  STATION_EPOCH_MS,
  cycleOrder,
  getSlotAt,
  getUpcoming,
  liveOffsetSeconds,
  scheduleFingerprint,
} from "../schedule";
import type { Track } from "../types";

function track(id: string, artist: string, duration: number): Track {
  return { id, artist, title: `Song ${id}`, year: 1985, duration, channel: artist };
}

/** Ten tracks, with artists A (x3) and B (x2) repeated so adjacency has to be actively avoided. */
const FIXTURE: Track[] = [
  track("a1", "Artist A", 201),
  track("a2", "Artist A", 187),
  track("a3", "artist a ", 240), // same artist, different spelling
  track("b1", "Artist B", 222),
  track("b2", "Artist B", 199),
  track("c1", "Artist C", 263),
  track("d1", "Artist D", 215),
  track("e1", "Artist E", 178),
  track("f1", "Artist F", 305),
  track("g1", "Artist G", 231),
];
const FIXTURE_CYCLE_MS = FIXTURE.reduce((sum, t) => sum + t.duration * 1000, 0);

const ids = (tracks: Track[]) => tracks.map((t) => t.id);
const artist = (t: Track) => t.artist.trim().toLowerCase();

/** Concatenated play order of the given cycles. */
function programme(tracks: Track[], fromCycle: number, toCycle: number): Track[] {
  const result: Track[] = [];
  for (let cycle = fromCycle; cycle <= toCycle; cycle++) result.push(...cycleOrder(cycle, tracks));
  return result;
}

function adjacentRepeats(sequence: Track[]): number {
  let repeats = 0;
  for (let i = 1; i < sequence.length; i++) if (artist(sequence[i]) === artist(sequence[i - 1])) repeats++;
  return repeats;
}

describe("cycleOrder", () => {
  it("is deterministic, independent of cache state and array identity", () => {
    const first = ids(cycleOrder(42, FIXTURE));
    expect(ids(cycleOrder(42, FIXTURE))).toEqual(first);
    expect(ids(cycleOrder(42, FIXTURE.map((t) => ({ ...t }))))).toEqual(first);
  });

  it("is pinned, so every browser and every deploy computes the same programme", () => {
    expect(ids(cycleOrder(0, FIXTURE))).toMatchInlineSnapshot(`
      [
        "a3",
        "d1",
        "e1",
        "c1",
        "g1",
        "a2",
        "b1",
        "f1",
        "a1",
        "b2",
      ]
    `);
    expect(ids(cycleOrder(-1, FIXTURE))).toMatchInlineSnapshot(`
      [
        "a1",
        "b2",
        "e1",
        "c1",
        "a3",
        "d1",
        "a2",
        "b1",
        "g1",
        "f1",
      ]
    `);
    expect(ids(cycleOrder(123_456, FIXTURE))).toMatchInlineSnapshot(`
      [
        "e1",
        "a1",
        "g1",
        "a2",
        "b1",
        "f1",
        "d1",
        "b2",
        "a3",
        "c1",
      ]
    `);
  });

  it("plays every track exactly once per cycle", () => {
    const expected = ids(FIXTURE).sort();
    for (let cycle = -50; cycle <= 50; cycle++) {
      expect(ids(cycleOrder(cycle, FIXTURE)).sort()).toEqual(expected);
    }
  });

  it("varies between cycles", () => {
    const orders = new Set<string>();
    for (let cycle = 0; cycle < 20; cycle++) orders.add(ids(cycleOrder(cycle, FIXTURE)).join(","));
    expect(orders.size).toBeGreaterThan(15);
  });

  it("never plays the same artist twice in a row when avoidable, including across cycle boundaries", () => {
    expect(adjacentRepeats(programme(FIXTURE, -30, 300))).toBe(0);
  });

  it("still returns a full permutation when repeats are unavoidable", () => {
    const crowded = [
      track("x1", "X", 200),
      track("x2", "X", 200),
      track("x3", "X", 200),
      track("x4", "X", 200),
      track("y1", "Y", 200),
      track("z1", "Z", 200),
    ];
    const cycles = 200;
    for (let cycle = 0; cycle < cycles; cycle++) {
      expect(ids(cycleOrder(cycle, crowded)).sort()).toEqual(ids(crowded).sort());
    }
    // Per cycle, 4 X with only 2 separators force at least 2 X-X pairs: the spacing reaches that optimum.
    const minimum = 4 * cycles - (2 * cycles + 1);
    expect(adjacentRepeats(programme(crowded, 0, cycles - 1))).toBe(minimum);
  });

  it("returns a copy that callers may mutate", () => {
    const order = cycleOrder(7, FIXTURE);
    order.reverse();
    expect(cycleOrder(7, FIXTURE)).not.toEqual(order);
  });

  it("handles tiny playlists", () => {
    const solo = [track("solo", "Solo", 100)];
    expect(ids(cycleOrder(-3, solo))).toEqual(["solo"]);
    const duo = [track("one", "One", 100), track("two", "Two", 120)];
    expect(ids(cycleOrder(9, duo)).sort()).toEqual(["one", "two"]);
  });

  it("rejects an empty playlist and invalid durations with a clear error", () => {
    expect(() => cycleOrder(0, [])).toThrow(/playlist is empty/);
    expect(() => getSlotAt(STATION_EPOCH_MS, [])).toThrow(/playlist is empty/);
    expect(() => getSlotAt(STATION_EPOCH_MS, [track("bad", "Bad", 0)])).toThrow(/invalid duration/);
    expect(() => getSlotAt(STATION_EPOCH_MS, [track("bad", "Bad", 12.5)])).toThrow(/invalid duration/);
  });
});

describe("getSlotAt", () => {
  it("starts cycle 0 with the first track of its order at the epoch", () => {
    const slot = getSlotAt(STATION_EPOCH_MS, FIXTURE);
    expect(slot).toMatchObject({ cycle: 0, index: 0, startsAt: STATION_EPOCH_MS });
    expect(slot.track).toEqual(cycleOrder(0, FIXTURE)[0]);
    expect(slot.endsAt).toBe(STATION_EPOCH_MS + slot.track.duration * 1000);
  });

  it("uses half-open boundaries: at exactly endsAt the next slot is on air", () => {
    const slot = getSlotAt(STATION_EPOCH_MS + 1234.5, FIXTURE);
    expect(getSlotAt(slot.startsAt, FIXTURE)).toBe(slot);
    expect(getSlotAt(slot.endsAt - 1, FIXTURE)).toBe(slot);
    expect(getSlotAt(slot.endsAt - 0.001, FIXTURE)).toBe(slot);
    const next = getSlotAt(slot.endsAt, FIXTURE);
    expect(next.index).toBe(slot.index + 1);
    expect(next.startsAt).toBe(slot.endsAt);
  });

  it("is continuous across many slots and cycle boundaries", () => {
    let slot = getSlotAt(STATION_EPOCH_MS + 5 * FIXTURE_CYCLE_MS - 1, FIXTURE);
    expect(slot).toMatchObject({ cycle: 4, index: FIXTURE.length - 1, endsAt: STATION_EPOCH_MS + 5 * FIXTURE_CYCLE_MS });
    for (let i = 0; i < FIXTURE.length * 3; i++) {
      const next = getSlotAt(slot.endsAt, FIXTURE);
      expect(next.startsAt).toBe(slot.endsAt);
      if (slot.index === FIXTURE.length - 1) {
        expect(next).toMatchObject({ cycle: slot.cycle + 1, index: 0 });
      } else {
        expect(next).toMatchObject({ cycle: slot.cycle, index: slot.index + 1 });
      }
      expect(next.track).toEqual(cycleOrder(next.cycle, FIXTURE)[next.index]);
      slot = next;
    }
  });

  it("works before the epoch (negative cycles) and for negative timestamps", () => {
    const justBefore = getSlotAt(STATION_EPOCH_MS - 1, FIXTURE);
    expect(justBefore).toMatchObject({ cycle: -1, index: FIXTURE.length - 1, endsAt: STATION_EPOCH_MS });

    for (const t of [STATION_EPOCH_MS - 10 * FIXTURE_CYCLE_MS - 12_345.25, -5e12, 0]) {
      const slot = getSlotAt(t, FIXTURE);
      expect(slot.startsAt).toBeLessThanOrEqual(t);
      expect(slot.endsAt).toBeGreaterThan(t);
      expect(slot.cycle).toBeLessThan(0);
      expect(slot.track).toEqual(cycleOrder(slot.cycle, FIXTURE)[slot.index]);
    }
    expect(getSlotAt(STATION_EPOCH_MS - 10 * FIXTURE_CYCLE_MS - 1, FIXTURE).cycle).toBe(-11);
  });

  it("returns the same frozen object for the same airing", () => {
    const a = getSlotAt(STATION_EPOCH_MS + 1000, FIXTURE);
    const b = getSlotAt(STATION_EPOCH_MS + 2000, FIXTURE);
    expect(b).toBe(a);
    expect(Object.isFrozen(a)).toBe(true);
  });

  it("repeats a single-track playlist back to back", () => {
    const solo = [track("solo", "Solo", 100)];
    const slot = getSlotAt(STATION_EPOCH_MS + 250_000, solo);
    expect(slot).toMatchObject({ cycle: 2, index: 0, startsAt: STATION_EPOCH_MS + 200_000, endsAt: STATION_EPOCH_MS + 300_000 });
    expect(getSlotAt(slot.endsAt, solo)).toMatchObject({ cycle: 3, index: 0 });
  });

  it("rejects non-finite times", () => {
    expect(() => getSlotAt(Number.NaN, FIXTURE)).toThrow(RangeError);
  });
});

describe("getUpcoming", () => {
  it("returns the slots after the current one, crossing into the next cycle", () => {
    const lastStart = STATION_EPOCH_MS + 3 * FIXTURE_CYCLE_MS - 1;
    const secondToLast = getSlotAt(getSlotAt(lastStart, FIXTURE).startsAt - 1, FIXTURE);
    expect(secondToLast).toMatchObject({ cycle: 2, index: FIXTURE.length - 2 });

    const upcoming = getUpcoming(secondToLast.startsAt + 500, 3, FIXTURE);
    expect(upcoming.map((s) => [s.cycle, s.index])).toEqual([
      [2, FIXTURE.length - 1],
      [3, 0],
      [3, 1],
    ]);
    expect(upcoming[0].startsAt).toBe(secondToLast.endsAt);
    expect(upcoming[1].startsAt).toBe(upcoming[0].endsAt);
    expect(upcoming[2].startsAt).toBe(upcoming[1].endsAt);
    for (const slot of upcoming) expect(getSlotAt(slot.startsAt, FIXTURE)).toBe(slot);
  });

  it("works for a single track and for count 0", () => {
    const solo = [track("solo", "Solo", 100)];
    const upcoming = getUpcoming(STATION_EPOCH_MS + 50_000, 3, solo);
    expect(upcoming.map((s) => s.cycle)).toEqual([1, 2, 3]);
    expect(upcoming.every((s) => s.track.id === "solo")).toBe(true);
    expect(getUpcoming(STATION_EPOCH_MS, 0, FIXTURE)).toEqual([]);
  });
});

describe("liveOffsetSeconds", () => {
  const slot = getSlotAt(STATION_EPOCH_MS, FIXTURE);
  const duration = slot.track.duration;

  it("is fractional seconds since the slot started", () => {
    expect(liveOffsetSeconds(slot, slot.startsAt)).toBe(0);
    expect(liveOffsetSeconds(slot, slot.startsAt + 12_345)).toBeCloseTo(12.345, 9);
  });

  it("clamps to [0, duration]", () => {
    expect(liveOffsetSeconds(slot, slot.startsAt - 5_000)).toBe(0);
    expect(liveOffsetSeconds(slot, slot.endsAt)).toBe(duration);
    expect(liveOffsetSeconds(slot, slot.endsAt + 60_000)).toBe(duration);
  });
});

describe("PLAYLIST", () => {
  it("is a valid schedule source", () => {
    expect(PLAYLIST.length).toBeGreaterThan(0);
    for (const t of PLAYLIST) {
      expect(t.id).toMatch(/^[\w-]{11}$/);
      expect(Number.isInteger(t.duration) && t.duration > 0).toBe(true);
    }
    expect(new Set(PLAYLIST.map((t) => t.id)).size).toBe(PLAYLIST.length);
    const now = STATION_EPOCH_MS + 300 * 24 * 3600 * 1000;
    const slot = getSlotAt(now);
    expect(slot.startsAt).toBeLessThanOrEqual(now);
    expect(getUpcoming(now, 3)).toHaveLength(3);
  });
});

describe("scheduleFingerprint", () => {
  it("is a stable short hash of the bundled playlist", () => {
    expect(SCHEDULE_FINGERPRINT).toMatch(/^[0-9a-f]{8}$/);
    expect(SCHEDULE_FINGERPRINT).toBe(scheduleFingerprint(PLAYLIST.map((t) => ({ ...t }))));
  });

  it("changes when one duration, one id or the track list changes", () => {
    const base = scheduleFingerprint(FIXTURE);
    const longer = FIXTURE.map((t, i) => (i === 4 ? { ...t, duration: t.duration + 1 } : t));
    const replaced = FIXTURE.map((t, i) => (i === 4 ? { ...t, id: "zz" } : t));
    expect(scheduleFingerprint(longer)).not.toBe(base);
    expect(scheduleFingerprint(replaced)).not.toBe(base);
    expect(scheduleFingerprint(FIXTURE.slice(1))).not.toBe(base);
  });

  it("ignores fields that don't affect the programme", () => {
    const renamed = FIXTURE.map((t) => ({ ...t, title: `${t.title} (Remastered)` }));
    expect(scheduleFingerprint(renamed)).toBe(scheduleFingerprint(FIXTURE));
  });
});
