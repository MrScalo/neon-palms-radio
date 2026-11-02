import heatwave from "@/data/stations/heatwave.json";
import neonpalms from "@/data/stations/neonpalms.json";
import rearview from "@/data/stations/rearview.json";
import type { Station } from "@/lib/radio/types";

/**
 * The network's stations, in preset order (preset 1 is the default station).
 * Tracks live in src/data/stations/<id>.json; check them with `npm run verify:playlist`.
 */
export const STATIONS: readonly Station[] = [
  {
    id: "heatwave",
    slug: "heatwave",
    name: "Heatwave",
    frequency: "107.7",
    tagline: "Fresh from the GTA VI trailers.",
    description:
      "Every song officially revealed so far for Grand Theft Auto VI — from the trailers, the extended look and the radio previews to the official album and score. The road to Leonida, live.",
    accent: "#ff8a3d",
    tracks: heatwave.tracks,
  },
  {
    id: "rearview",
    slug: "rearview",
    name: "Rearview",
    frequency: "85.5",
    tagline: "Classics from the GTA radio dial.",
    description:
      "Eighties hits that played on the in-game radio of earlier Grand Theft Auto games — GTA Vice City, Vice City Stories, San Andreas, GTA IV and GTA V. From the neon coast to the West Coast.",
    accent: "#22e6ff",
    tracks: rearview.tracks,
  },
  {
    id: "neonpalms",
    slug: "neon-palms",
    name: "Neon Palms",
    frequency: "88.6",
    tagline: "Pure 80s. No strings attached.",
    description:
      "No game history, no cameos — just the decade's biggest hits with the same Vice City sunset feeling.",
    accent: "#ff2fa0",
    tracks: neonpalms.tracks,
  },
];

export const DEFAULT_STATION_ID = STATIONS[0].id;

/** Stations with a page of their own (/<slug>); the default station is the home page. */
export const STATION_PAGES: readonly Station[] = STATIONS.filter((station) => station.id !== DEFAULT_STATION_ID);

/** The station whose own page is /<slug>. */
export function getStationBySlug(slug: string): Station | undefined {
  return STATION_PAGES.find((station) => station.slug === slug);
}

/** The station with this id; an unknown or missing id gives the default station. */
export function getStation(id: string | null | undefined): Station {
  return STATIONS.find((station) => station.id === id) ?? STATIONS[0];
}
