import { useEffect } from "react";
import type { Track } from "@/lib/radio/types";
import { STATION } from "./station";

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

/** Shows the song in the browser tab while listening; restores the page title afterwards. */
export function useNowPlayingTitle(track: Track | null): void {
  const artist = track?.artist;
  const title = track?.title;

  useEffect(() => {
    if (!artist || !title) return;
    return claimTitle(document, `▶ ${artist} – ${title} · ${STATION.name}`);
  }, [artist, title]);
}
