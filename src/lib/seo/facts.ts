import { GAME } from "@/config/seo";
import { site } from "@/config/site";
import { DEFAULT_STATION_ID, getStation, STATIONS } from "@/config/stations";
import { stationPath } from "@/components/radio/stationUrl";
import type { Station, Track } from "@/lib/radio/types";
import { absoluteUrl } from "./structuredData";

/**
 * Plain-text facts built from the station data, so the FAQ, llms.txt and structured data always
 * match what is actually on air.
 */

const HEATWAVE = getStation("heatwave");
const REARVIEW = getStation("rearview");

function songs(tracks: readonly Track[]): string {
  return tracks.map((track) => `${track.artist} – “${track.title}”`).join(", ");
}

/** Where a GTA VI song was revealed ("Trailer 2") and when, from "GTA VI · Trailer 2 · 2025". */
function reveal(track: Track): { source: string; year: string } | null {
  const parts = track.heardIn?.split(" · ") ?? [];
  return parts.length === 3 ? { source: parts[1], year: parts[2] } : null;
}

/** The songs of each GTA VI trailer, in the order the trailers came out. */
export function trailerSongs(): { trailer: string; year: string; tracks: Track[] }[] {
  const groups = new Map<string, { trailer: string; year: string; tracks: Track[] }>();
  for (const track of HEATWAVE.tracks) {
    const found = reveal(track);
    if (found === null || !/trailer|teaser/i.test(found.source)) continue;
    const group = groups.get(found.source) ?? { trailer: found.source, year: found.year, tracks: [] };
    group.tracks.push(track);
    groups.set(found.source, group);
  }
  return [...groups.values()].sort((a, b) => a.year.localeCompare(b.year) || a.trailer.localeCompare(b.trailer));
}

/** Earlier GTA games the Rearview songs played in, most songs first. */
export function rearviewGames(): { game: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const track of REARVIEW.tracks) {
    const games = track.heardIn?.split(" · ")[0].split(" & ") ?? [];
    for (const game of games) counts.set(game, (counts.get(game) ?? 0) + 1);
  }
  return [...counts.entries()].map(([game, count]) => ({ game, count })).sort((a, b) => b.count - a.count);
}

function stationLine(station: Station): string {
  return `${station.name} ${station.frequency}`;
}

const RELEASE = new Date(`${GAME.releaseDate}T12:00:00Z`).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export type FaqEntry = { question: string; answer: string };

export function faqEntries(): FaqEntry[] {
  const [heatwave, rearview, pure] = STATIONS;
  const totalSongs = STATIONS.reduce((sum, station) => sum + station.tracks.length, 0);
  const trailers = trailerSongs()
    .map((group) => `${group.trailer} (${group.year}): ${songs(group.tracks)}.`)
    .join(" ");
  const games = rearviewGames()
    .map(({ game, count }) => `${game} (${count} ${count === 1 ? "song" : "songs"})`)
    .join(", ");

  return [
    {
      question: `What is ${site.name}?`,
      answer: `${site.name} is a free, unofficial fan web radio for ${GAME.name} (GTA 6) and the Grand Theft Auto series, in an 80s neon look. It runs three stations: ${stationLine(heatwave)} plays the songs revealed for GTA VI, ${stationLine(rearview)} plays 80s hits from the in-game radio of earlier GTA games, and ${stationLine(pure)} plays pure 80s hits. Everyone on a station hears the same song at the same moment, like real radio.`,
    },
    {
      question: "Is this the official GTA 6 radio?",
      answer: `No. ${site.name} is a fan project and is not affiliated with, endorsed or sponsored by ${GAME.publisher} or Take-Two Interactive. The official GTA VI radio stations are part of the game itself. Every song here plays from the official YouTube upload of the artist or their label.`,
    },
    {
      question: "Which songs are in the GTA 6 trailers?",
      answer: `${trailers} ${stationLine(heatwave)} plays all of them, together with the songs from the radio previews, the extended look and the official album.`,
    },
    {
      question: "When does GTA 6 come out?",
      answer: `${GAME.publisher} has dated ${GAME.name} for ${RELEASE}. The countdown at the top of the radio counts down to that day in your own time zone.`,
    },
    {
      question: "What is Leonida?",
      answer: `${GAME.setting} is the fictional US state where ${GAME.name} is set: ${GAME.publisher}' take on Florida and the home of Vice City. ${stationLine(heatwave)} is the soundtrack for the road there.`,
    },
    {
      question: `Which GTA games are the songs on ${rearview.name} from?`,
      answer: `${stationLine(rearview)} plays 80s songs that were on the in-game radio of ${games}.`,
    },
    {
      question: "Does everyone really hear the same song?",
      answer:
        "Yes. Each station follows a fixed, shuffled schedule on a shared clock, so the radio knows which song is on air and how far into it the station is. Tuning in joins the song at the live position, and switching stations jumps straight to what is playing there.",
    },
    {
      question: "Is it free? Do I need an account?",
      answer:
        "It is free, with no account, no ads and no tracking. The music plays through YouTube's embedded player in privacy-enhanced mode, which only loads after you agree to it on the radio.",
    },
    {
      question: "Where can I see every song?",
      answer: `The rotation page lists all ${totalSongs} songs of the three stations, with the official YouTube upload of each: ${absoluteUrl("/rotation")}`,
    },
  ];
}

function stationUrl(station: Station): string {
  return absoluteUrl(stationPath(station, DEFAULT_STATION_ID));
}

function trackLine(track: Track): string {
  return `- ${track.artist} – ${track.title} (${track.year})${track.heardIn ? ` · ${track.heardIn}` : ""}`;
}

/** /llms.txt (https://llmstxt.org): what the site is, for AI assistants. `full` adds every track. */
export function llmsText(full: boolean): string {
  const lines = [
    `# ${site.name}`,
    "",
    `> Free, unofficial fan web radio for ${GAME.name} (GTA 6) and the Grand Theft Auto series: three stations live 24/7, every listener on a station hears the same song at the same time. Not affiliated with ${GAME.publisher}.`,
    "",
    `- Website: ${absoluteUrl("/")}`,
    `- GTA VI release date: ${RELEASE} (set in ${GAME.setting}, home of Vice City)`,
    "- Music: official YouTube uploads by the artists and labels, in YouTube's privacy-enhanced player after consent",
    "- Free, no account, no ads, no tracking",
    `- Instagram: [${site.instagram.handle}](${site.instagram.url})`,
    "",
    "## Stations",
    "",
    ...STATIONS.map((station) => `- [${stationLine(station)}](${stationUrl(station)}): ${station.description}`),
    "",
    "## Pages",
    "",
    `- [The Rotation](${absoluteUrl("/rotation")}): every song on every station, with the GTA game or trailer it was heard in`,
    `- [About & FAQ](${absoluteUrl("/about")}): GTA 6 trailer songs, release date, Leonida, how the radio works`,
    "",
    "## Optional",
    "",
    full
      ? `- [Short version](${absoluteUrl("/llms.txt")})`
      : `- [Full tracklist](${absoluteUrl("/llms-full.txt")}): every song with artist, year and where it was heard`,
  ];
  if (full) {
    for (const station of STATIONS) {
      lines.push("", `## ${stationLine(station)} — ${station.tracks.length} songs`, "", station.description, "");
      lines.push(...station.tracks.map(trackLine));
    }
    lines.push("", "## FAQ", "");
    for (const entry of faqEntries()) lines.push(`### ${entry.question}`, "", entry.answer, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
