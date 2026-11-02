/**
 * Switch stations too often, too fast, and stars light up next to the listener count. Calm down and
 * they start flashing, then fade away.
 */
export const WANTED = {
  maxStars: 6,
  /** Switches are counted over this long */
  windowMs: 8_000,
  /** From this many switches in the window, every further switch adds a star */
  threshold: 5,
  /** Quiet time before the stars start flashing */
  calmMs: 6_000,
  /** Further quiet time until they are gone */
  evadeMs: 10_000,
} as const;

export type WantedState = {
  stars: number;
  /** When the stars were last stirred up (ms, any monotonic clock) */
  heatAt: number;
  /** Recent switch times, oldest first */
  switches: readonly number[];
};

export type WantedView = {
  stars: number;
  /** The stars are flashing: one more quiet stretch and they are gone */
  evading: boolean;
  /** When the view changes next on its own; null when it won't */
  changesAt: number | null;
};

export const NOT_WANTED: WantedState = { stars: 0, heatAt: 0, switches: [] };

/** What the stars look like at `now`. */
export function viewWanted(state: WantedState, now: number): WantedView {
  if (state.stars === 0) return { stars: 0, evading: false, changesAt: null };
  const goneAt = state.heatAt + WANTED.calmMs + WANTED.evadeMs;
  if (now >= goneAt) return { stars: 0, evading: false, changesAt: null };
  const flashAt = state.heatAt + WANTED.calmMs;
  return now >= flashAt
    ? { stars: state.stars, evading: true, changesAt: goneAt }
    : { stars: state.stars, evading: false, changesAt: flashAt };
}

// Stars that have already faded away are gone for good.
function settle(state: WantedState, now: number): WantedState {
  return state.stars > 0 && viewWanted(state, now).stars === 0 ? { ...state, stars: 0 } : state;
}

/** The listener switched stations at `now`. While stars are lit, any switch keeps them from fading. */
export function recordSwitch(state: WantedState, now: number): WantedState {
  const current = settle(state, now);
  const switches = [...current.switches.filter((time) => now - time < WANTED.windowMs), now];
  const stars = switches.length >= WANTED.threshold ? Math.min(WANTED.maxStars, current.stars + 1) : current.stars;
  return { stars, heatAt: stars > 0 ? now : current.heatAt, switches };
}

/** Adds (or with a negative `delta` takes away) stars. Down to none, the slate is wiped clean. */
export function adjustStars(state: WantedState, delta: number, now: number): WantedState {
  const current = settle(state, now);
  const stars = Math.min(WANTED.maxStars, Math.max(0, current.stars + delta));
  return stars === 0 ? NOT_WANTED : { ...current, stars, heatAt: now };
}
