import { describe, expect, it } from "vitest";
import { playStaticBurst, staticPeakGain } from "../staticBurst";

describe("staticPeakGain", () => {
  it("follows the radio volume and stays quiet", () => {
    const full = staticPeakGain(100, false, false);
    expect(full).toBeGreaterThan(0);
    expect(full).toBeLessThanOrEqual(0.25);
    expect(staticPeakGain(50, false, false)).toBeCloseTo(full / 2);
  });

  it("is silent when muted or at zero volume", () => {
    expect(staticPeakGain(80, true, false)).toBe(0);
    expect(staticPeakGain(0, false, false)).toBe(0);
    expect(staticPeakGain(Number.NaN, false, false)).toBe(0);
  });

  it("is quieter with reduced motion", () => {
    expect(staticPeakGain(80, false, true)).toBeLessThan(staticPeakGain(80, false, false));
    expect(staticPeakGain(80, false, true)).toBeGreaterThan(0);
  });

  it("never goes above full volume", () => {
    expect(staticPeakGain(250, false, false)).toBe(staticPeakGain(100, false, false));
  });
});

describe("playStaticBurst", () => {
  it("does nothing, and never throws, without Web Audio", () => {
    expect(() => playStaticBurst(0.1)).not.toThrow();
    expect(() => playStaticBurst(0)).not.toThrow();
  });
});
