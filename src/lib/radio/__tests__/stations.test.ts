import { describe, expect, it } from "vitest";
import { DEFAULT_STATION_ID, getStation, STATIONS } from "@/config/stations";
import { SCHEDULE_FINGERPRINT, STATION_EPOCH_MS, getSlotAt, getUpcoming, scheduleFingerprint } from "../schedule";

describe("STATIONS", () => {
  it("has at least one station, each with a unique URL-safe id", () => {
    expect(STATIONS.length).toBeGreaterThan(0);
    for (const station of STATIONS) expect(station.id).toMatch(/^[a-z0-9-]+$/);
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
  });

  it("uses 11-character YouTube ids, unique within and across stations", () => {
    const seen = new Map<string, string>();
    for (const station of STATIONS) {
      for (const track of station.tracks) {
        expect(track.id, `${station.id}: ${track.artist} – ${track.title}`).toMatch(/^[\w-]{11}$/);
        expect(seen.get(track.id), `${track.id} on ${station.id}`).toBeUndefined();
        seen.set(track.id, station.id);
      }
    }
  });

  it("are valid schedule sources", () => {
    const now = STATION_EPOCH_MS + 300 * 24 * 3600 * 1000;
    for (const station of STATIONS) {
      expect(station.tracks.length, station.id).toBeGreaterThan(0);
      for (const t of station.tracks) {
        expect(Number.isInteger(t.duration) && t.duration > 0, `${station.id}: ${t.id}`).toBe(true);
      }
      const slot = getSlotAt(now, station);
      expect(slot.stationId).toBe(station.id);
      expect(slot.startsAt).toBeLessThanOrEqual(now);
      expect(getUpcoming(now, 3, station)).toHaveLength(3);
    }
  });

  it("keep heardIn to the formats from the README", () => {
    const game = "(GTA Vice City|GTA Vice City Stories|GTA San Andreas|GTA IV|GTA IV: The Ballad of Gay Tony|GTA V)";
    // Every station needs an entry; null means the station has no heardIn notes at all.
    const formats: Record<string, RegExp | null> = {
      heatwave:
        /^GTA VI · (Trailer 1|Trailer 2|Launch trailer|Extended look|Teaser|Radio preview|Official album|Original score|Official playlist) · \d{4}$/,
      rearview: new RegExp(`^${game}( & ${game})* · \\d{4}(, \\d{4})*$`),
      neonpalms: null,
    };
    for (const station of STATIONS) {
      const format = formats[station.id];
      expect(format, `heardIn format for ${station.id}`).not.toBeUndefined();
      for (const t of station.tracks) {
        const label = `${station.id}: ${t.artist} – ${t.title}`;
        if (format) expect(t.heardIn ?? "", label).toMatch(format);
        else expect(t.heardIn, label).toBeUndefined();
      }
    }
  });

  it("are what SCHEDULE_FINGERPRINT covers", () => {
    const copies = STATIONS.map((s) => ({ ...s, tracks: s.tracks.map((t) => ({ ...t })) }));
    expect(SCHEDULE_FINGERPRINT).toBe(scheduleFingerprint(copies));
  });
});

describe("getStation", () => {
  it("finds every station by id", () => {
    for (const station of STATIONS) expect(getStation(station.id)).toBe(station);
  });

  it("falls back to the default station, preset 1", () => {
    const fallback = getStation(DEFAULT_STATION_ID);
    expect(fallback).toBe(STATIONS[0]);
    for (const id of [null, undefined, "", "unknown", "HEATWAVE "]) expect(getStation(id)).toBe(fallback);
  });
});
