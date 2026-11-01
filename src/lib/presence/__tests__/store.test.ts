import { describe, expect, it } from "vitest";
import { countsFromValues, presenceKey } from "../store";

const IDS = ["heatwave", "rearview", "neonpalms"];

describe("presenceKey", () => {
  it("names one counter per station and window, nothing else", () => {
    expect(presenceKey("rearview", 58_812_345)).toBe("np:presence:rearview:58812345");
  });
});

describe("countsFromValues", () => {
  it("adds up the stations in order and fills in every station", () => {
    expect(countsFromValues(IDS, ["12", null, "3"])).toEqual({
      total: 15,
      stations: { heatwave: 12, rearview: 0, neonpalms: 3 },
    });
  });

  it("takes numbers as well as Redis strings", () => {
    expect(countsFromValues(IDS, [1, "2", 3])).toEqual({ total: 6, stations: { heatwave: 1, rearview: 2, neonpalms: 3 } });
  });

  it("counts missing or unusable values as 0", () => {
    expect(countsFromValues(IDS, ["-4", "1.5", "abc"])).toEqual({
      total: 0,
      stations: { heatwave: 0, rearview: 0, neonpalms: 0 },
    });
    expect(countsFromValues(IDS, [Number.NaN, -1, { count: 2 }])).toEqual({
      total: 0,
      stations: { heatwave: 0, rearview: 0, neonpalms: 0 },
    });
    expect(countsFromValues(IDS, ["7"])).toEqual({ total: 7, stations: { heatwave: 7, rearview: 0, neonpalms: 0 } });
    expect(countsFromValues(IDS, ["99999999999999999999"]).stations.heatwave).toBe(0);
  });
});
