import { describe, expect, it } from "vitest";
import type { Slot, Track } from "@/lib/radio/types";
import { formatClock, secondsUntil, slotKey } from "../format";

const track: Track = { id: "x", artist: "Artist", title: "Title", year: 1986, duration: 200, channel: "Artist" };

function slot(startsAt: number, index = 0): Slot {
  return { stationId: "neonpalms", track, cycle: 3, index, startsAt, endsAt: startsAt + track.duration * 1000 };
}

describe("formatClock", () => {
  it("formats minutes and seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(244)).toBe("4:04");
    expect(formatClock(599.9)).toBe("9:59");
  });

  it("adds hours from one hour up", () => {
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(3725)).toBe("1:02:05");
  });

  it("never shows negative or invalid values", () => {
    expect(formatClock(-5)).toBe("0:00");
    expect(formatClock(Number.NaN)).toBe("0:00");
  });
});

describe("secondsUntil", () => {
  it("counts down to the next slot from the live position", () => {
    const current = slot(1_000_000);
    const next = slot(1_200_000, 1);
    expect(secondsUntil(next, current, 0)).toBe(200);
    expect(secondsUntil(next, current, 150)).toBe(50);
  });

  it("clamps at zero", () => {
    expect(secondsUntil(slot(1_000_000, 1), slot(1_000_000), 30)).toBe(0);
  });
});

describe("slotKey", () => {
  it("identifies an airing by station, cycle and position", () => {
    expect(slotKey(slot(0, 4))).toBe("neonpalms:3:4");
  });

  it("tells the same position on two stations apart", () => {
    expect(slotKey({ ...slot(0, 4), stationId: "heatwave" })).not.toBe(slotKey(slot(0, 4)));
  });
});
