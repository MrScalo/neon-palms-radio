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
    name: "Heatwave",
    frequency: "107.7",
    tagline: "Fresh from the trailers.",
    description:
      "Songs officially revealed so far for the most anticipated return to the neon coast — from trailers, first looks and radio previews to the official album and score.",
    accent: "#ff8a3d",
    tracks: heatwave.tracks,
  },
  {
    id: "rearview",
    name: "Rearview",
    frequency: "85.5",
    tagline: "Classics from the in-game dial.",
    description:
      "Eighties cuts that once played on the car radios of a legendary open-world crime saga — from the neon coast to the West Coast.",
    accent: "#22e6ff",
    tracks: rearview.tracks,
  },
  {
    id: "neonpalms",
    name: "Neon Palms",
    frequency: "88.6",
    tagline: "Pure 80s. No strings attached.",
    description:
      "No game history, no cameos — just the decade's biggest hits with the same sunset feeling.",
    accent: "#ff2fa0",
    tracks: neonpalms.tracks,
  },
];

export const DEFAULT_STATION_ID = STATIONS[0].id;

/** The station with this id; an unknown or missing id gives the default station. */
export function getStation(id: string | null | undefined): Station {
  return STATIONS.find((station) => station.id === id) ?? STATIONS[0];
}
