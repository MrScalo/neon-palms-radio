import { useEffect } from "react";
import type { Station, Track } from "@/lib/radio/types";

/**
 * Sets the tab title and returns an undo that restores the old one, unless someone else has
 * changed it since: on client navigation the undo runs after the next route has set its own title.
 */
export function claimTitle(doc: { title: string }, title: string): () => void {
  const previous = doc.title;
  doc.title = title;
  return () => {
    if (doc.title === title) doc.title = previous;
  };
}

/** "▶ Artist – Title · Station 107.7" */
export function nowPlayingTitle(
  track: Pick<Track, "artist" | "title">,
  station: Pick<Station, "name" | "frequency">,
): string {
  return `▶ ${track.artist} – ${track.title} · ${station.name} ${station.frequency}`;
}

/** Shows the song and station in the browser tab while listening; restores the page title afterwards. */
export function useNowPlayingTitle(track: Track | null, station: Station): void {
  const artist = track?.artist;
  const title = track?.title;
  const { name, frequency } = station;

  useEffect(() => {
    if (!artist || !title) return;
    return claimTitle(document, nowPlayingTitle({ artist, title }, { name, frequency }));
  }, [artist, title, name, frequency]);
}
