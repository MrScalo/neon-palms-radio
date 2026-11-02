import { site } from "@/config/site";

/** Identity of the network. The stations themselves live in src/config/stations.ts. */
export const NETWORK = {
  name: site.name,
  /** The neon script part of the logo */
  wordmark: site.wordmark,
  /** Shown next to the wordmark */
  suffix: "Radio",
  band: "FM",
  tagline: "Three stations. One endless summer.",
} as const;

/** Lines for the bulletin ticker. Invented and PG; the only names are the game's fictional places. */
export const BULLETINS: readonly string[] = [
  "Coast weather: 81 degrees at sundown across Leonida and a warm breeze rolling in off the water.",
  "Three stations, three buttons. Press 1, 2 or 3 and the radio does the rest.",
  "Causeway traffic is moving smoothly in both directions. Windows down, volume up.",
  "Heatwave 107.7 is running hot tonight with every song from the GTA VI trailers. Handle with sunglasses.",
  "Lifeguard tower six reports perfect sunset visibility and one very confident seagull.",
  "Rearview 85.5: objects in the mirror are closer, and more synth-heavy, than they appear.",
  "Boardwalk update: the roller skates are out and the arcade lights just flickered on.",
  "Neon Palms 88.6: no strings attached. Just synths, saxophones and sunsets.",
  "Tonight's forecast: neon glow from dusk till dawn with scattered synth.",
  "The request line is closed, but we have a feeling this next one is exactly what you wanted.",
];
