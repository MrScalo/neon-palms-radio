import { GAME, STATION_SEO } from "@/config/seo";
import { site } from "@/config/site";
import { DEFAULT_STATION_ID } from "@/config/stations";
import { stationPath } from "@/components/radio/stationUrl";
import type { Station, Track } from "@/lib/radio/types";

/** schema.org graphs for the pages. Nodes link to each other by @id, so each fact is stated once. */

const CONTEXT = "https://schema.org";
const WEBSITE_ID = `${site.url}/#website`;
const GAME_ID = `${site.url}/#game`;
const SERIES_ID = `${site.url}/#series`;

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).href;
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: absoluteUrl("/"),
    name: site.name,
    alternateName: [site.wordmark, `${site.wordmark} FM`, new URL(site.url).host],
    description: STATION_SEO[DEFAULT_STATION_ID].description,
    inLanguage: "en",
  };
}

function publisherNode() {
  return { "@type": "Organization", name: GAME.publisher };
}

function gameNode() {
  return {
    "@type": "VideoGame",
    "@id": GAME_ID,
    name: GAME.name,
    alternateName: GAME.alternateNames,
    publisher: publisherNode(),
    datePublished: GAME.releaseDate,
    isPartOf: { "@id": SERIES_ID },
  };
}

function seriesNode() {
  return {
    "@type": "VideoGameSeries",
    "@id": SERIES_ID,
    name: "Grand Theft Auto",
    alternateName: "GTA",
    publisher: publisherNode(),
  };
}

/** What a station's music is about: the new game, the series, or nothing in particular. */
function stationTopic(station: Station): { "@id": string } | undefined {
  if (station.id === "heatwave") return { "@id": GAME_ID };
  if (station.id === "rearview") return { "@id": SERIES_ID };
  return undefined;
}

function stationNode(station: Station) {
  return {
    "@type": "RadioBroadcastService",
    "@id": `${absoluteUrl(stationPath(station, DEFAULT_STATION_ID))}#station`,
    name: `${station.name} ${station.frequency}`,
    broadcastDisplayName: station.name,
    description: station.description,
    url: absoluteUrl(stationPath(station, DEFAULT_STATION_ID)),
    inLanguage: "en",
    serviceType: "Online radio",
    category: "Music",
    isAccessibleForFree: true,
  };
}

/** Home and station pages: the site, the station on the page and what its music is from. */
export function stationPageGraph(station: Station) {
  const url = absoluteUrl(stationPath(station, DEFAULT_STATION_ID));
  const seo = STATION_SEO[station.id];
  const topic = stationTopic(station);
  return {
    "@context": CONTEXT,
    "@graph": [
      websiteNode(),
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: seo.title,
        description: seo.description,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: { "@id": `${url}#station` },
        ...(topic ? { about: topic } : {}),
      },
      stationNode(station),
      ...(topic ? [seriesNode(), ...(station.id === "heatwave" ? [gameNode()] : [])] : []),
    ],
  };
}

function isoDuration(seconds: number): string {
  return `PT${Math.floor(seconds / 60)}M${seconds % 60}S`;
}

function recordingNode(track: Track) {
  return {
    "@type": "MusicRecording",
    name: track.title,
    byArtist: { "@type": "MusicGroup", name: track.artist },
    duration: isoDuration(track.duration),
    copyrightYear: track.year,
    url: `https://www.youtube.com/watch?v=${track.id}`,
    ...(track.heardIn ? { description: `Heard in: ${track.heardIn}` } : {}),
  };
}

/** The rotation page: every station's playlist. */
export function rotationGraph(stations: readonly Station[], page: { path: string; title: string; description: string }) {
  const url = absoluteUrl(page.path);
  return {
    "@context": CONTEXT,
    "@graph": [
      websiteNode(),
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        about: [{ "@id": GAME_ID }, { "@id": SERIES_ID }],
        hasPart: stations.map((station) => ({ "@id": `${url}#${station.id}-playlist` })),
      },
      gameNode(),
      seriesNode(),
      ...stations.map((station) => ({
        "@type": "MusicPlaylist",
        "@id": `${url}#${station.id}-playlist`,
        name: `${station.name} ${station.frequency} — full rotation`,
        description: station.description,
        url: `${url}#${station.id}`,
        numTracks: station.tracks.length,
        track: station.tracks.map(recordingNode),
      })),
    ],
  };
}

/** The about page: its questions and answers. */
export function faqGraph(page: { path: string; title: string }, entries: readonly { question: string; answer: string }[]) {
  const url = absoluteUrl(page.path);
  return {
    "@context": CONTEXT,
    "@graph": [
      websiteNode(),
      {
        "@type": "FAQPage",
        "@id": `${url}#webpage`,
        url,
        name: page.title,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": GAME_ID },
        mainEntity: entries.map((entry) => ({
          "@type": "Question",
          name: entry.question,
          acceptedAnswer: { "@type": "Answer", text: entry.answer },
        })),
      },
      gameNode(),
      seriesNode(),
    ],
  };
}
