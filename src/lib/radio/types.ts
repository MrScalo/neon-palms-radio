/** One song in rotation. Every track is an official video on the artist's or label's YouTube channel. */
export type Track = {
  /** YouTube video ID */
  id: string;
  artist: string;
  title: string;
  year: number;
  /** Whole seconds, exactly YouTube's `lengthSeconds` for this video. Drives the shared schedule. */
  duration: number;
  /** Name of the official YouTube channel that uploaded the video (shown as credit). */
  channel: string;
  /**
   * Only for an official upload that YouTube shows without a badge (label channel, unmerged VEVO
   * channel, the artist's own unbadged channel, joint upload): why the channel is official.
   * verify-videos.mjs accepts a missing badge only with this note.
   */
  officialNote?: string;
  /** Where the song was heard, e.g. "GTA VI · Trailer 2 · 2025" or "GTA Vice City · 2002" (formats: README). */
  heardIn?: string;
};

/** One station of the network. Each station runs its own shared schedule over its own tracks. */
export type Station = {
  /** URL-safe id, also the data file name in src/data/stations/ */
  id: string;
  /** Path segment of the station's own page (/<slug>); the default station lives at / instead. */
  slug: string;
  name: string;
  /** Dial frequency in MHz, e.g. "107.7" */
  frequency: string;
  /** Short, catchy line shown on the preset button */
  tagline: string;
  /** One or two sentences on what kind of songs the station plays (rotation page, structured data) */
  description: string;
  /** Accent colour of the station (any CSS colour) */
  accent: string;
  tracks: readonly Track[];
};

/** One scheduled airing of a track. All times are station-clock milliseconds since the Unix epoch. */
export type Slot = {
  /** Id of the station this slot airs on. */
  stationId: string;
  track: Track;
  /** Rotation cycle number (each cycle plays every track exactly once). */
  cycle: number;
  /** Position of the track inside that cycle's order. */
  index: number;
  startsAt: number;
  endsAt: number;
};

/**
 * - off:          not tuned in (no YouTube code loaded by us, or player destroyed)
 * - connecting:   loading the IFrame API / player / first buffering after tune-in, or waiting
 *                 to retry after a failure that may be temporary
 * - playing:      audio is running and synced to the live position
 * - buffering:    player is buffering mid-stream, or waiting to retry like "connecting"
 * - needs-gesture: browser blocked autoplay; UI must show a button that calls resume()
 * - paused:       listener paused via the video itself, or the engine held playback because the
 *                 tab is hidden or the player mostly off-screen (YouTube policy; resumes by itself
 *                 once the player is visible again); resume() jumps back to live
 * - signal-lost:  YouTube refused this video, or it still failed after a few retries; tries
 *                 again automatically with the next slot
 */
export type RadioStatus =
  | "off"
  | "connecting"
  | "playing"
  | "buffering"
  | "needs-gesture"
  | "paused"
  | "signal-lost";
