import { describe, expect, it } from "vitest";
import {
  reconcileAddress,
  stationIdFromPath,
  stationIdFromSearch,
  stationPath,
  withStationPath,
} from "../stationUrl";

const stations = [
  { id: "heatwave", slug: "heatwave" },
  { id: "rearview", slug: "rearview" },
  { id: "neonpalms", slug: "neon-palms" },
];
const DEFAULT = "heatwave";

function at(pathname: string, search = "") {
  return { pathname, search };
}

describe("stationPath", () => {
  it("puts the default station at / and the others on their own page", () => {
    expect(stationPath(stations[0], DEFAULT)).toBe("/");
    expect(stationPath(stations[1], DEFAULT)).toBe("/rearview");
    expect(stationPath(stations[2], DEFAULT)).toBe("/neon-palms");
  });
});

describe("stationIdFromSearch", () => {
  it("returns a station an old link names", () => {
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

describe("stationIdFromPath", () => {
  it("knows the station pages", () => {
    expect(stationIdFromPath("/rearview", stations, DEFAULT)).toBe("rearview");
    expect(stationIdFromPath("/neon-palms", stations, DEFAULT)).toBe("neonpalms");
  });

  it("ignores / and other pages", () => {
    expect(stationIdFromPath("/", stations, DEFAULT)).toBeNull();
    expect(stationIdFromPath("/heatwave", stations, DEFAULT)).toBeNull();
    expect(stationIdFromPath("/rotation", stations, DEFAULT)).toBeNull();
    expect(stationIdFromPath("/neonpalms", stations, DEFAULT)).toBeNull();
  });
});

describe("withStationPath", () => {
  it("moves to the station's page", () => {
    expect(withStationPath("https://example.test/", "/rearview")).toBe("/rearview");
    expect(withStationPath("https://example.test/rearview", "/")).toBe("/");
  });

  it("drops an old station parameter and keeps everything else", () => {
    expect(withStationPath("https://example.test/?a=1&station=heatwave#top", "/neon-palms")).toBe("/neon-palms?a=1#top");
  });
});

describe("reconcileAddress", () => {
  it("writes a kept station back into a bare address", () => {
    expect(reconcileAddress(at("/"), stations, "rearview", DEFAULT)).toEqual({ writePath: "/rearview" });
  });

  it("leaves a bare address alone on the default station", () => {
    expect(reconcileAddress(at("/"), stations, "heatwave", DEFAULT)).toBeNull();
  });

  it("follows a station page", () => {
    expect(reconcileAddress(at("/neon-palms"), stations, "heatwave", DEFAULT)).toEqual({ select: "neonpalms" });
    expect(reconcileAddress(at("/rearview"), stations, "rearview", DEFAULT)).toBeNull();
  });

  it("follows an old ?station= link and moves it to the station's page", () => {
    expect(reconcileAddress(at("/", "?station=rearview"), stations, "heatwave", DEFAULT)).toEqual({
      select: "rearview",
      writePath: "/rearview",
    });
    expect(reconcileAddress(at("/", "?station=heatwave"), stations, "heatwave", DEFAULT)).toEqual({ writePath: "/" });
  });

  it("treats an unknown station like a bare address", () => {
    expect(reconcileAddress(at("/", "?station=pirate"), stations, "heatwave", DEFAULT)).toBeNull();
    expect(reconcileAddress(at("/", "?station=pirate"), stations, "neonpalms", DEFAULT)).toEqual({
      writePath: "/neon-palms",
    });
  });
});
