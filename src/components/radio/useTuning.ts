import { useCallback, useEffect, useState } from "react";

/** One station switch made by the listener. */
export type TuneEvent = {
  /** Counts switches, so two switches between the same stations are still two events. */
  seq: number;
  /** False with reduced motion: everything switches instantly. */
  animate: boolean;
};

/** How long the idle screen shows static after a switch. */
export const TUNING_MS = 900;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Client-only; read it in event handlers or effects, never during render. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;
}

/** The listener's station switches and whether the set is still settling on the last one. */
export function useTuning() {
  const [event, setEvent] = useState<TuneEvent | null>(null);
  const [settledSeq, setSettledSeq] = useState(0);

  useEffect(() => {
    if (event === null || !event.animate) return;
    const timer = setTimeout(() => setSettledSeq(event.seq), TUNING_MS);
    return () => clearTimeout(timer);
  }, [event]);

  const startTuning = useCallback((animate: boolean) => {
    setEvent((previous) => ({ seq: (previous?.seq ?? 0) + 1, animate }));
  }, []);

  const tuning = event !== null && event.animate && settledSeq !== event.seq;
  return { event, tuning, startTuning };
}
