import { describe, expect, it } from "vitest";
import { PRESENCE_WINDOW_MS } from "@/lib/presence/protocol";
import {
  PING_EDGE_MS,
  PING_JITTER_MAX_MS,
  PING_JITTER_MIN_MS,
  parsePresenceResponse,
  pingJitterMs,
  planPing,
} from "../presence";

const W = PRESENCE_WINDOW_MS;
/** Start of window 1000 */
const T = 1000 * W;

describe("pingJitterMs", () => {
  it("spreads pings between 2 and 20 seconds into a window", () => {
    expect(pingJitterMs(0)).toBe(PING_JITTER_MIN_MS);
    expect(pingJitterMs(0.5)).toBe(11_000);
    expect(pingJitterMs(0.999_999)).toBeLessThan(PING_JITTER_MAX_MS);
    expect(PING_JITTER_MIN_MS).toBe(2_000);
    expect(PING_JITTER_MAX_MS).toBe(20_000);
  });

  it("stays in range for odd input", () => {
    expect(pingJitterMs(-1)).toBe(PING_JITTER_MIN_MS);
    expect(pingJitterMs(7)).toBe(PING_JITTER_MAX_MS);
    expect(pingJitterMs(Number.NaN)).toBe(PING_JITTER_MIN_MS);
  });
});

describe("planPing", () => {
  it("pings right away when a tab first shows up in a window", () => {
    expect(planPing(T + 9_000, null, 5_000)).toEqual({ window: 1000, at: T + 9_000 });
  });

  it("pings right away in a window the tab hasn't pinged yet", () => {
    expect(planPing(T + 25_000, 999, 5_000)).toEqual({ window: 1000, at: T + 25_000 });
  });

  it("waits for the edge margin at the very start of a window", () => {
    expect(planPing(T + 500, null, 5_000)).toEqual({ window: 1000, at: T + PING_EDGE_MS });
    expect(planPing(T, 999, 5_000)).toEqual({ window: 1000, at: T + PING_EDGE_MS });
  });

  it("leaves out a window that is about to end", () => {
    expect(planPing(T + W - PING_EDGE_MS, null, 5_000)).toEqual({ window: 1000, at: T + W - PING_EDGE_MS });
    expect(planPing(T + W - 1_000, null, 5_000)).toEqual({ window: 1001, at: T + W + 5_000 });
  });

  it("schedules the next window at its jitter once this one is pinged", () => {
    expect(planPing(T + 3_000, 1000, 12_345)).toEqual({ window: 1001, at: T + W + 12_345 });
    expect(planPing(T + W - 1, 1000, 2_000)).toEqual({ window: 1001, at: T + W + 2_000 });
  });

  it("never pings a window twice", () => {
    for (const offset of [0, 1, 1_999, 2_000, 15_000, 28_000, W - 1]) {
      expect(planPing(T + offset, 1000, 4_000).window).toBe(1001);
    }
  });

  it("is due at the planned moment, then moves on to the next window", () => {
    const plan = planPing(T + 3_000, 1000, 7_000);
    expect(planPing(plan.at, 1000, 7_000)).toEqual({ window: 1001, at: plan.at });
    expect(planPing(plan.at, 1001, 9_000)).toEqual({ window: 1002, at: T + 2 * W + 9_000 });
  });

  it("catches up after a late timer without skipping the current window", () => {
    expect(planPing(T + 2 * W + 4_000, 1000, 7_000)).toEqual({ window: 1002, at: T + 2 * W + 4_000 });
  });

  it("waits for the window after the last ping when the clock steps back", () => {
    expect(planPing(T + 3_000, 1001, 7_000)).toEqual({ window: 1002, at: T + 2 * W + 7_000 });
  });
});

describe("parsePresenceResponse", () => {
  it("reads the counts", () => {
    const counts = { total: 6, stations: { heatwave: 4, rearview: 2, neonpalms: 0 } };
    expect(parsePresenceResponse({ counts })).toEqual(counts);
  });

  it("passes null through: counting is switched off", () => {
    expect(parsePresenceResponse({ counts: null })).toBeNull();
  });

  it("rejects anything else, so the last good counts stay", () => {
    for (const body of [
      null,
      "nope",
      {},
      { counts: 3 },
      { counts: { total: "3", stations: {} } },
      { counts: { total: -1, stations: {} } },
      { counts: { total: 3 } },
      { counts: { total: 3, stations: [] } },
      { counts: { total: 3, stations: { heatwave: Number.NaN } } },
      { counts: { total: 3, stations: { heatwave: "3" } } },
    ]) {
      expect(parsePresenceResponse(body)).toBeUndefined();
    }
  });

  it("keeps only the counts", () => {
    expect(parsePresenceResponse({ counts: { total: 1, stations: { heatwave: 1 }, extra: true } })).toEqual({
      total: 1,
      stations: { heatwave: 1 },
    });
  });
});
