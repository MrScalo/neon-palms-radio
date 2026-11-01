import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../memory";
import { PRESENCE_WINDOW_MS } from "../protocol";

const IDS = ["heatwave", "rearview", "neonpalms"];

function storeWithClock(startMs = 0) {
  const clock = { now: startMs };
  return { clock, store: createMemoryStore({ now: () => clock.now }) };
}

describe("memory store", () => {
  it("answers with the previous window, not the one being counted", async () => {
    const { clock, store } = storeWithClock();
    expect(await store.ping("heatwave", 10, IDS)).toEqual({
      total: 0,
      stations: { heatwave: 0, rearview: 0, neonpalms: 0 },
    });
    await store.ping("heatwave", 10, IDS);
    await store.ping("rearview", 10, IDS);

    clock.now += PRESENCE_WINDOW_MS;
    expect(await store.ping("neonpalms", 11, IDS)).toEqual({
      total: 3,
      stations: { heatwave: 2, rearview: 1, neonpalms: 0 },
    });
    // Window 12 sees only window 11's single ping; window 10 no longer matters.
    clock.now += PRESENCE_WINDOW_MS;
    expect(await store.ping("heatwave", 12, IDS)).toEqual({
      total: 1,
      stations: { heatwave: 0, rearview: 0, neonpalms: 1 },
    });
  });

  it("forgets counters 120 s after their last ping", async () => {
    const { clock, store } = storeWithClock(1_000);
    await store.ping("heatwave", 5, IDS);

    clock.now += 119_999;
    expect((await store.ping("rearview", 6, IDS))?.stations.heatwave).toBe(1);

    clock.now += 120_000;
    expect((await store.ping("rearview", 6, IDS))?.stations.heatwave).toBe(0);
  });

  it("refreshes the expiry with every ping, like EXPIRE after INCR", async () => {
    const { clock, store } = storeWithClock();
    await store.ping("heatwave", 5, IDS);
    clock.now += 100_000;
    await store.ping("heatwave", 5, IDS);
    clock.now += 100_000;
    expect((await store.ping("rearview", 6, IDS))?.stations.heatwave).toBe(2);
  });
});
