import { COUNTDOWN } from "./countdown";
import { site } from "./site";

/**
 * What search engines and AI assistants read about the network: page titles, descriptions and the
 * facts behind the structured data. The game is named plainly here to describe the music; the
 * site is a fan project and says so (FAN_PROJECT_DISCLAIMER).
 */

/** The game the Heatwave songs come from. */
export const GAME = {
  name: "Grand Theft Auto VI",
  alternateNames: ["GTA 6", "GTA VI", "GTA6"],
  publisher: "Rockstar Games",
  /** Fictional state the game is set in, home to Vice City */
  setting: "Leonida",
  releaseDate: `${COUNTDOWN.target.year}-${String(COUNTDOWN.target.month).padStart(2, "0")}-${String(COUNTDOWN.target.day).padStart(2, "0")}`,
} as const;

export type PageSeo = {
  /** The whole <title>, at most about 60 characters */
  title: string;
  /** Search result snippet, about 150 characters */
  description: string;
};

/** Per station; the default station's entry is also the home page's. */
export const STATION_SEO: Record<string, PageSeo & { /** One line for the social preview image */ imageLine: string }> = {
  heatwave: {
    title: `${site.name} — GTA 6 Radio: Every Trailer Song, Live`,
    description:
      "Unofficial GTA 6 fan radio: every song from the GTA VI trailers on the road to Leonida, classic GTA radio hits and pure 80s — live 24/7, in sync for everyone.",
    imageLine: "Every song from the GTA VI trailers",
  },
  rearview: {
    title: "Rearview 85.5 — Classic GTA Radio Hits, Live 24/7",
    description:
      "80s hits from the in-game radio of GTA Vice City, Vice City Stories, San Andreas, GTA IV and GTA V — an unofficial fan radio, live 24/7 and in sync for everyone.",
    imageLine: "80s hits from the GTA radio dial",
  },
  neonpalms: {
    title: "Neon Palms 88.6 — Pure 80s Hits Radio, Live 24/7",
    description:
      "The biggest 80s hits with that Vice City sunset feeling: synth-pop, new wave and power ballads, live 24/7 and in sync for every listener. Free, no sign-up.",
    imageLine: "The biggest 80s hits, nonstop",
  },
};

export const KEYWORDS: readonly string[] = [
  "GTA 6 radio",
  "GTA VI radio",
  "GTA 6 songs",
  "GTA 6 trailer songs",
  "GTA 6 trailer 2 song",
  "Leonida radio",
  "Vice City radio",
  "GTA radio stations",
  "GTA Vice City songs",
  "80s radio",
  "synthwave radio",
  "Neon Palms",
  "Neon Palms Radio",
];
