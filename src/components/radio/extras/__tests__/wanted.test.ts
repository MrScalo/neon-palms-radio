import { describe, expect, it } from "vitest";
import { adjustStars, NOT_WANTED, recordSwitch, viewWanted, WANTED, type WantedState } from "../wanted";

function switchesAt(times: number[], from: WantedState = NOT_WANTED): WantedState {
  return times.reduce((state, time) => recordSwitch(state, time), from);
}

describe("wanted stars", () => {
  it("light up from the fifth quick switch, one per switch, up to the maximum", () => {
    expect(switchesAt([0, 500, 1000, 1500]).stars).toBe(0);
    expect(switchesAt([0, 500, 1000, 1500, 2000]).stars).toBe(1);
    expect(switchesAt([0, 500, 1000, 1500, 2000, 2500]).stars).toBe(2);
    const mashed = Array.from({ length: 20 }, (_, index) => index * 200);
    expect(switchesAt(mashed).stars).toBe(WANTED.maxStars);
  });

  it("stay dark when switching at a calm pace", () => {
    const calm = Array.from({ length: 12 }, (_, index) => index * 2000);
    expect(switchesAt(calm).stars).toBe(0);
  });

  it("flash after a quiet spell, then go away", () => {
    const state = switchesAt([0, 100, 200, 300, 400]);
    expect(viewWanted(state, 1000)).toEqual({ stars: 1, evading: false, changesAt: 400 + WANTED.calmMs });
    const flashing = viewWanted(state, 400 + WANTED.calmMs);
    expect(flashing.evading).toBe(true);
    expect(flashing.changesAt).toBe(400 + WANTED.calmMs + WANTED.evadeMs);
    expect(viewWanted(state, 400 + WANTED.calmMs + WANTED.evadeMs)).toEqual({ stars: 0, evading: false, changesAt: null });
  });

  it("stop flashing when the listener switches again", () => {
    const state = switchesAt([0, 100, 200, 300, 400]);
    // Flashing, and the quick switches are out of the window by now.
    const later = 400 + WANTED.windowMs + 1000;
    expect(viewWanted(state, later).evading).toBe(true);
    const again = recordSwitch(state, later);
    expect(again.stars).toBe(1);
    expect(viewWanted(again, later).evading).toBe(false);
  });

  it("don't come back after fading out", () => {
    const state = switchesAt([0, 100, 200, 300, 400]);
    const muchLater = 400 + WANTED.calmMs + WANTED.evadeMs + 5000;
    expect(recordSwitch(state, muchLater).stars).toBe(0);
  });

  it("can be raised, lowered and cleared directly", () => {
    const raised = adjustStars(NOT_WANTED, 2, 0);
    expect(raised.stars).toBe(2);
    expect(adjustStars(raised, -1, 10).stars).toBe(1);
    expect(adjustStars(raised, 99, 10).stars).toBe(WANTED.maxStars);
    expect(adjustStars(raised, -WANTED.maxStars, 10)).toEqual(NOT_WANTED);
  });

  it("start over after being cleared", () => {
    const cleared = adjustStars(switchesAt([0, 100, 200, 300, 400]), -WANTED.maxStars, 500);
    expect(recordSwitch(cleared, 600).stars).toBe(0);
  });
});
