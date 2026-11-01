import { describe, expect, it } from "vitest";
import {
  SCHEDULE_FINGERPRINT,
  STATION_EPOCH_MS,
  cycleOrder,
  getOnAir,
  getSlotAt,
  getUpcoming,
  liveOffsetSeconds,
  scheduleFingerprint,
} from "../schedule";
import type { Station, Track } from "../types";

function track(id: string, artist: string, duration: number): Track {
  return { id, artist, title: `Song ${id}`, year: 1985, duration, channel: artist };
}

function station(id: string, tracks: Track[]): Station {
  return { id, name: `Station ${id}`, frequency: "88.6", tagline: "", description: "", accent: "#ff2fa0", tracks };
}

/** Ten tracks, with artists A (x3) and B (x2) repeated so adjacency has to be actively avoided. */
const FIXTURE_TRACKS: Track[] = [
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
const FIXTURE = station("fixture", FIXTURE_TRACKS);
/** Same tracks, another station: must air its own programme. */
const SISTER = station("sister", FIXTURE_TRACKS);
const FIXTURE_CYCLE_MS = FIXTURE_TRACKS.reduce((sum, t) => sum + t.duration * 1000, 0);

const ids = (tracks: Track[]) => tracks.map((t) => t.id);
const artist = (t: Track) => t.artist.trim().toLowerCase();

/** Concatenated play order of the given cycles. */
function programme(on: Station, fromCycle: number, toCycle: number): Track[] {
  const result: Track[] = [];
  for (let cycle = fromCycle; cycle <= toCycle; cycle++) result.push(...cycleOrder(cycle, on));
  return result;
}

function adjacentRepeats(sequence: Track[]): number {
  let repeats = 0;
  for (let i = 1; i < sequence.length; i++) if (artist(sequence[i]) === artist(sequence[i - 1])) repeats++;
  return repeats;
}

describe("cycleOrder", () => {
  it("is deterministic, independent of cache state, array identity and station metadata", () => {
    const first = ids(cycleOrder(42, FIXTURE));
    expect(ids(cycleOrder(42, FIXTURE))).toEqual(first);
    expect(ids(cycleOrder(42, station("fixture", FIXTURE_TRACKS.map((t) => ({ ...t })))))).toEqual(first);
    expect(ids(cycleOrder(42, { ...FIXTURE, name: "Renamed", frequency: "99.9", accent: "#000" }))).toEqual(first);
    expect(ids(cycleOrder(42, FIXTURE))).toEqual(first);
  });

  it("gives every station its own order, even with the same tracks", () => {
    let differing = 0;
    for (let cycle = 0; cycle < 20; cycle++) {
      const own = ids(cycleOrder(cycle, FIXTURE));
      const sister = ids(cycleOrder(cycle, SISTER));
      expect(sister.slice().sort()).toEqual(own.slice().sort());
      if (sister.join(",") !== own.join(",")) differing++;
    }
    expect(differing).toBeGreaterThan(15);
    expect(ids(cycleOrder(0, station("heatwave", FIXTURE_TRACKS)))).not.toEqual(
      ids(cycleOrder(0, station("rearview", FIXTURE_TRACKS))),
    );
  });

  it("is pinned, so every browser and every deploy computes the same programme", () => {
    expect(ids(cycleOrder(0, FIXTURE))).toMatchInlineSnapshot(`
      [
        "b2",
        "g1",
        "a2",
        "b1",
        "a1",
        "c1",
        "f1",
        "e1",
        "a3",
        "d1",
      ]
    `);
    expect(ids(cycleOrder(-1, FIXTURE))).toMatchInlineSnapshot(`
      [
        "c1",
        "g1",
        "a2",
        "b2",
        "a3",
        "e1",
        "a1",
        "f1",
        "b1",
        "d1",
      ]
    `);
    expect(ids(cycleOrder(123_456, FIXTURE))).toMatchInlineSnapshot(`
      [
        "b2",
        "f1",
        "a1",
        "d1",
        "e1",
        "c1",
        "a3",
        "b1",
        "a2",
        "g1",
      ]
    `);
    expect(ids(cycleOrder(0, SISTER))).toMatchInlineSnapshot(`
      [
        "b2",
        "a1",
        "f1",
        "d1",
        "a3",
        "g1",
        "c1",
        "a2",
        "b1",
        "e1",
      ]
    `);
  });

  it("plays every track exactly once per cycle", () => {
    const expected = ids(FIXTURE_TRACKS).sort();
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
    expect(adjacentRepeats(programme(SISTER, -30, 300))).toBe(0);
  });

  it("still returns a full permutation when repeats are unavoidable", () => {
    const crowdedTracks = [
      track("x1", "X", 200),
      track("x2", "X", 200),
      track("x3", "X", 200),
      track("x4", "X", 200),
      track("y1", "Y", 200),
      track("z1", "Z", 200),
    ];
    const crowded = station("crowded", crowdedTracks);
    const cycles = 200;
    for (let cycle = 0; cycle < cycles; cycle++) {
      expect(ids(cycleOrder(cycle, crowded)).sort()).toEqual(ids(crowdedTracks).sort());
    }
    // 4 X per cycle with only 2 separators: X-X pairs = X count − X runs, and at best every
    // separator stands alone between two runs (one run fewer for each end that is a separator).
    // The spacing reaches that optimum.
    const sequence = programme(crowded, 0, cycles - 1);
    const isSeparator = (t: Track) => artist(t) !== "x";
    const separators = sequence.filter(isSeparator).length;
    const separatorEnds = [sequence[0], sequence[sequence.length - 1]].filter(isSeparator).length;
    expect(separators).toBe(2 * cycles);
    expect(adjacentRepeats(sequence)).toBe(4 * cycles - (separators + 1 - separatorEnds));
  });

  it("returns a copy that callers may mutate", () => {
    const order = cycleOrder(7, FIXTURE);
    order.reverse();
    expect(cycleOrder(7, FIXTURE)).not.toEqual(order);
  });

  it("handles tiny stations", () => {
    const solo = station("solo", [track("solo", "Solo", 100)]);
    expect(ids(cycleOrder(-3, solo))).toEqual(["solo"]);
    const duo = station("duo", [track("one", "One", 100), track("two", "Two", 120)]);
    expect(ids(cycleOrder(9, duo)).sort()).toEqual(["one", "two"]);
  });

  it("rejects an empty station and invalid durations with an error naming the station", () => {
    expect(() => cycleOrder(0, station("silent", []))).toThrow(/station "silent" has no tracks/);
    expect(() => getSlotAt(STATION_EPOCH_MS, station("silent", []))).toThrow(/station "silent" has no tracks/);
    expect(() => getSlotAt(STATION_EPOCH_MS, station("zero", [track("bad", "Bad", 0)]))).toThrow(
      /station "zero": track "bad" has an invalid duration/,
    );
    expect(() => getSlotAt(STATION_EPOCH_MS, station("half", [track("bad", "Bad", 12.5)]))).toThrow(
      /station "half": track "bad" has an invalid duration/,
    );
  });
});

describe("getSlotAt", () => {
  it("starts cycle 0 with the first track of its order at the epoch", () => {
    const slot = getSlotAt(STATION_EPOCH_MS, FIXTURE);
    expect(slot).toMatchObject({ stationId: "fixture", cycle: 0, index: 0, startsAt: STATION_EPOCH_MS });
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

  it("is continuous across many slots and cycle boundaries, separately on every station", () => {
    for (const on of [FIXTURE, SISTER]) {
      let slot = getSlotAt(STATION_EPOCH_MS + 5 * FIXTURE_CYCLE_MS - 1, on);
      expect(slot).toMatchObject({
        stationId: on.id,
        cycle: 4,
        index: FIXTURE_TRACKS.length - 1,
        endsAt: STATION_EPOCH_MS + 5 * FIXTURE_CYCLE_MS,
      });
      for (let i = 0; i < FIXTURE_TRACKS.length * 3; i++) {
        // Asking the other station in between must not disturb this one's caches.
        getSlotAt(slot.endsAt, on === FIXTURE ? SISTER : FIXTURE);
        const next = getSlotAt(slot.endsAt, on);
        expect(next.stationId).toBe(on.id);
        expect(next.startsAt).toBe(slot.endsAt);
        if (slot.index === FIXTURE_TRACKS.length - 1) {
          expect(next).toMatchObject({ cycle: slot.cycle + 1, index: 0 });
        } else {
          expect(next).toMatchObject({ cycle: slot.cycle, index: slot.index + 1 });
        }
        expect(next.track).toEqual(cycleOrder(next.cycle, on)[next.index]);
        slot = next;
      }
    }
  });

  it("works before the epoch (negative cycles) and for negative timestamps", () => {
    const justBefore = getSlotAt(STATION_EPOCH_MS - 1, FIXTURE);
    expect(justBefore).toMatchObject({ cycle: -1, index: FIXTURE_TRACKS.length - 1, endsAt: STATION_EPOCH_MS });

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
    getSlotAt(STATION_EPOCH_MS + 1000, SISTER);
    const b = getSlotAt(STATION_EPOCH_MS + 2000, FIXTURE);
    expect(b).toBe(a);
    expect(Object.isFrozen(a)).toBe(true);
  });

  it("repeats a single-track station back to back", () => {
    const solo = station("solo", [track("solo", "Solo", 100)]);
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
    expect(secondToLast).toMatchObject({ cycle: 2, index: FIXTURE_TRACKS.length - 2 });

    const upcoming = getUpcoming(secondToLast.startsAt + 500, 3, FIXTURE);
    expect(upcoming.map((s) => [s.cycle, s.index])).toEqual([
      [2, FIXTURE_TRACKS.length - 1],
      [3, 0],
      [3, 1],
    ]);
    expect(upcoming[0].startsAt).toBe(secondToLast.endsAt);
    expect(upcoming[1].startsAt).toBe(upcoming[0].endsAt);
    expect(upcoming[2].startsAt).toBe(upcoming[1].endsAt);
    for (const slot of upcoming) expect(getSlotAt(slot.startsAt, FIXTURE)).toBe(slot);
    expect(upcoming.every((slot) => slot.stationId === "fixture")).toBe(true);
  });

  it("works for a single track and for count 0", () => {
    const solo = station("solo", [track("solo", "Solo", 100)]);
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

describe("getOnAir", () => {
  const solo = station("solo", [track("solo", "Solo", 100)]);
  const network = [FIXTURE, SISTER, solo];

  it("has the slot on air on every station, by id", () => {
    const now = STATION_EPOCH_MS + 12_345_678;
    const onAir = getOnAir(now, network);
    expect([...onAir.keys()]).toEqual(["fixture", "sister", "solo"]);
    for (const on of network) expect(onAir.get(on.id)).toBe(getSlotAt(now, on));
  });

  it("keeps its identity until one station's song changes", () => {
    const now = getSlotAt(STATION_EPOCH_MS + 7_777_777, solo).startsAt + 1_000;
    const first = getOnAir(now, network);
    expect(getOnAir(now + 500, network)).toBe(first);

    const firstChange = Math.min(...network.map((on) => getSlotAt(now, on).endsAt));
    expect(getOnAir(firstChange - 1, network)).toBe(first);
    const changed = getOnAir(firstChange, network);
    expect(changed).not.toBe(first);
    expect(getOnAir(firstChange + 1, network)).toBe(changed);
  });
});

describe("scheduleFingerprint", () => {
  const network = [FIXTURE, station("other", FIXTURE_TRACKS.slice(0, 5))];
  const base = scheduleFingerprint(network);
  const withFixtureTracks = (tracks: Track[]) => [station("fixture", tracks), network[1]];

  it("is a stable short hash of the bundled stations", () => {
    expect(SCHEDULE_FINGERPRINT).toMatch(/^[0-9a-f]{8}$/);
    expect(base).toMatch(/^[0-9a-f]{8}$/);
    expect(scheduleFingerprint(network.map((on) => station(on.id, on.tracks.map((t) => ({ ...t })))))).toBe(base);
  });

  it("changes when any station's durations, ids, artists or track list change", () => {
    const changeFifth = (change: Partial<Track>) =>
      scheduleFingerprint(withFixtureTracks(FIXTURE_TRACKS.map((t, i) => (i === 4 ? { ...t, ...change } : t))));
    expect(changeFifth({ duration: FIXTURE_TRACKS[4].duration + 1 })).not.toBe(base);
    expect(changeFifth({ id: "zz" })).not.toBe(base);
    expect(changeFifth({ artist: "Artist Z" })).not.toBe(base);
    expect(scheduleFingerprint(withFixtureTracks(FIXTURE_TRACKS.slice(1)))).not.toBe(base);
    expect(scheduleFingerprint([network[0], station("other", FIXTURE_TRACKS.slice(0, 4))])).not.toBe(base);
  });

  it("changes when a station is renamed by id, added or removed", () => {
    expect(scheduleFingerprint([station("renamed", FIXTURE_TRACKS), network[1]])).not.toBe(base);
    expect(scheduleFingerprint([...network, SISTER])).not.toBe(base);
    expect(scheduleFingerprint(network.slice(0, 1))).not.toBe(base);
  });

  it("ignores fields that don't affect the programme", () => {
    const retitled = network.map((on) => ({
      ...on,
      name: `${on.name} FM`,
      tagline: "New line",
      accent: "#000",
      tracks: on.tracks.map((t) => ({ ...t, title: `${t.title} (Remastered)`, heardIn: "Trailer 1 · 2023" })),
    }));
    expect(scheduleFingerprint(retitled)).toBe(base);
  });
});
