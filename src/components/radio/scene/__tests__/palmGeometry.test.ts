import { describe, expect, it } from "vitest";
import { PALMS, buildPalm, frondPath, trunkPath, type PalmSpec } from "../palmGeometry";

const spec: PalmSpec = {
  width: 100,
  height: 200,
  base: { x: 50, y: 200 },
  crown: { x: 60, y: 40 },
  bow: -10,
  baseWidth: 10,
  topWidth: 5,
  rings: 4,
  fronds: [{ angle: -20, length: 40, droop: 60, leaflet: 10 }],
  coconuts: [],
};

describe("palm geometry", () => {
  it("is deterministic, so server and client markup always match", () => {
    expect(buildPalm(spec)).toEqual(buildPalm(spec));
    expect(trunkPath(spec)).toBe(trunkPath(spec));
  });

  it("produces closed paths with whole-number coordinates", () => {
    const paths = [trunkPath(spec), frondPath(spec.crown, spec.fronds[0])];
    for (const d of paths) {
      expect(d.startsWith("M")).toBe(true);
      expect(d.endsWith("Z")).toBe(true);
      expect(d).not.toMatch(/NaN|\./);
    }
  });

  it("pivots each palm on its trunk base", () => {
    for (const shape of Object.values(PALMS)) {
      expect(shape.pivot.y).toBe(1);
      expect(shape.pivot.x).toBeGreaterThan(0);
      expect(shape.pivot.x).toBeLessThan(1);
      expect(shape.fronds.length).toBeGreaterThan(0);
    }
  });
});
