/**
 * Countdown chip in the header. Discreet on purpose: it never names what it counts down to.
 * The target is midnight in the visitor's own time zone on that day.
 */
export const COUNTDOWN = {
  /** Calendar day of the release (month is 1-based) */
  target: { year: 2026, month: 11, day: 19 },
  label: "Return to the neon coast in",
  /** Shown from the target moment on, for `outNowDays` days; afterwards the chip disappears. */
  outNowLabel: "Out now",
  outNowDays: 7,
  /** Clicking the chip tunes to this station */
  stationId: "heatwave",
} as const;
