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
  /** Only set for label channels without a verified badge: why this channel is official. */
  officialNote?: string;
};

/** One scheduled airing of a track. All times are station-clock milliseconds since the Unix epoch. */
export type Slot = {
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
