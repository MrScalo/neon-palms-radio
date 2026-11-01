import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeClockOffset } from "../clock";
import { SCHEDULE_FINGERPRINT } from "../schedule";

describe("computeClockOffset", () => {
  it("uses the sample with the smallest round trip and assumes the server answered at its midpoint", () => {
    const offset = computeClockOffset([
      { t0: 1_000, t1: 1_300, serverNow: 5_000 },
      { t0: 2_000, t1: 2_040, serverNow: 6_100 },
      { t0: 3_000, t1: 3_120, serverNow: 7_000 },
      { t0: 4_000, t1: 4_090, serverNow: 8_000 },
    ]);
    // Best sample: rtt 40 ms, midpoint 2020 → 6100 - 2020
    expect(offset).toBe(4_080);
  });

  it("handles a local clock that runs ahead of the server (negative offset)", () => {
    expect(computeClockOffset([{ t0: 10_000, t1: 10_010, serverNow: 7_005 }])).toBe(-3_000);
  });

  it("keeps the first of equally fast samples", () => {
    expect(
      computeClockOffset([
        { t0: 0, t1: 20, serverNow: 110 },
        { t0: 100, t1: 120, serverNow: 999 },
      ]),
    ).toBe(100);
  });

  it("ignores unusable samples and returns null when none are left", () => {
    expect(computeClockOffset([])).toBeNull();
    expect(
      computeClockOffset([
        { t0: 50, t1: 40, serverNow: 1_000 },
        { t0: Number.NaN, t1: 10, serverNow: 1_000 },
        { t0: 0, t1: 10, serverNow: Number.POSITIVE_INFINITY },
      ]),
    ).toBeNull();
    expect(
      computeClockOffset([
        { t0: 50, t1: 40, serverNow: 1_000 },
        { t0: 0, t1: 100, serverNow: 1_050 },
      ]),
    ).toBe(1_000);
  });
});

describe("schedule check against /api/time", () => {
  const SERVER_AHEAD_MS = 60_000;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { addEventListener() {}, visibilityState: "visible" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Runs the first clock sync of a fresh clock module against a server answering with `extra`. */
  async function syncWith(extra: Record<string, unknown>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ now: Date.now() + SERVER_AHEAD_MS, ...extra }) })),
    );
    vi.resetModules();
    const clock = await import("../clock");
    clock.stationNow();
    await vi.waitFor(() => expect(clock.stationNow() - Date.now()).toBeGreaterThan(SERVER_AHEAD_MS - 1_000));
    return clock;
  }

  it("flags a server that airs another programme", async () => {
    const clock = await syncWith({ schedule: "0badc0de" });
    expect(clock.isScheduleOutdated()).toBe(true);
    expect(clock.getServerSchedule()).toBe("0badc0de");
  });

  it("stays quiet for the same programme", async () => {
    const clock = await syncWith({ schedule: SCHEDULE_FINGERPRINT });
    expect(clock.isScheduleOutdated()).toBe(false);
    expect(clock.getServerSchedule()).toBeNull();
  });

  it("ignores a missing or malformed schedule field", async () => {
    expect((await syncWith({})).isScheduleOutdated()).toBe(false);
    expect((await syncWith({ schedule: 42 })).isScheduleOutdated()).toBe(false);
  });
});
