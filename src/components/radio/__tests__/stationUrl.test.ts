import { describe, expect, it } from "vitest";
import { reconcileAddress, stationIdFromSearch, withStationParam } from "../stationUrl";

const stations = [{ id: "heatwave" }, { id: "rearview" }, { id: "neonpalms" }];

describe("stationIdFromSearch", () => {
  it("returns a station the link names", () => {
    expect(stationIdFromSearch("?station=rearview", stations)).toBe("rearview");
    expect(stationIdFromSearch("?utm=x&station=neonpalms", stations)).toBe("neonpalms");
  });

  it("ignores missing, empty and unknown stations", () => {
    expect(stationIdFromSearch("", stations)).toBeNull();
    expect(stationIdFromSearch("?station=", stations)).toBeNull();
    expect(stationIdFromSearch("?station=pirate", stations)).toBeNull();
    expect(stationIdFromSearch("?station=Rearview", stations)).toBeNull();
  });
});

describe("withStationParam", () => {
  it("adds the station to a plain URL", () => {
    expect(withStationParam("https://example.test/", "rearview")).toBe("/?station=rearview");
  });

  it("replaces the station and keeps everything else", () => {
    expect(withStationParam("https://example.test/?a=1&station=heatwave#top", "neonpalms")).toBe(
      "/?a=1&station=neonpalms#top",
    );
  });

  it("stays on the same path", () => {
    expect(withStationParam("https://example.test/listen", "heatwave")).toBe("/listen?station=heatwave");
  });
});

describe("reconcileAddress", () => {
  it("writes a kept station back into a bare address", () => {
    expect(reconcileAddress("", stations, "rearview", "heatwave")).toEqual({ writeParam: "rearview" });
  });

  it("leaves a bare address alone on the default station", () => {
    expect(reconcileAddress("", stations, "heatwave", "heatwave")).toBeNull();
  });

  it("follows an address that names another station", () => {
    expect(reconcileAddress("?station=neonpalms", stations, "heatwave", "heatwave")).toEqual({ select: "neonpalms" });
    expect(reconcileAddress("?station=heatwave", stations, "rearview", "heatwave")).toEqual({ select: "heatwave" });
  });

  it("does nothing when the address already matches", () => {
    expect(reconcileAddress("?station=rearview", stations, "rearview", "heatwave")).toBeNull();
  });

  it("treats an unknown station like a bare address", () => {
    expect(reconcileAddress("?station=pirate", stations, "heatwave", "heatwave")).toBeNull();
    expect(reconcileAddress("?station=pirate", stations, "neonpalms", "heatwave")).toEqual({ writeParam: "neonpalms" });
  });
});
