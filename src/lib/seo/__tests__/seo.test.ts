import { describe, expect, it } from "vitest";
import { STATION_SEO } from "@/config/seo";
import { STATIONS } from "@/config/stations";
import { faqEntries, llmsText, rearviewGames, trailerSongs } from "../facts";
import { stationPageGraph } from "../structuredData";

describe("station SEO copy", () => {
  it("exists for every station and fits a search result", () => {
    for (const station of STATIONS) {
      const seo = STATION_SEO[station.id];
      expect(seo, station.id).toBeDefined();
      expect(seo.title.length, `${station.id} title`).toBeLessThanOrEqual(65);
      expect(seo.description.length, `${station.id} description`).toBeLessThanOrEqual(170);
    }
  });
});

describe("facts from the station data", () => {
  it("groups the trailer songs by trailer, oldest first", () => {
    const trailers = trailerSongs();
    expect(trailers.length).toBeGreaterThan(0);
    expect(trailers[0].trailer).toBe("Trailer 1");
    for (const group of trailers) expect(group.tracks.length).toBeGreaterThan(0);
  });

  it("counts every rearview song under at least one game", () => {
    const rearview = STATIONS.find((station) => station.id === "rearview")!;
    const counted = rearviewGames().reduce((sum, { count }) => sum + count, 0);
    expect(counted).toBeGreaterThanOrEqual(rearview.tracks.length);
    expect(rearviewGames().every(({ game }) => game.startsWith("GTA"))).toBe(true);
  });

  it("answers every FAQ question", () => {
    for (const entry of faqEntries()) {
      expect(entry.question.endsWith("?")).toBe(true);
      expect(entry.answer.length).toBeGreaterThan(40);
    }
  });
});

describe("llms.txt", () => {
  it("links every station page", () => {
    const text = llmsText(false);
    expect(text.startsWith("# ")).toBe(true);
    expect(text).toContain("https://neonpalms.de/rearview");
    expect(text).toContain("https://neonpalms.de/neon-palms");
  });

  it("lists every track in the full version", () => {
    const text = llmsText(true);
    for (const station of STATIONS) for (const track of station.tracks) expect(text).toContain(track.title);
  });
});

describe("structured data", () => {
  it("describes each station page with its own address", () => {
    for (const station of STATIONS) {
      const graph = stationPageGraph(station)["@graph"] as { "@type": string; url?: string }[];
      const service = graph.find((node) => node["@type"] === "RadioBroadcastService");
      expect(service?.url).toMatch(/^https:\/\/neonpalms\.de\//);
    }
  });
});
