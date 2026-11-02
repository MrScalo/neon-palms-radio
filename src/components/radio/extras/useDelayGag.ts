import { useEffect, useRef, useState } from "react";

/** Click the countdown a few times quickly and it pretends the date slipped again. */
export const DELAY_GAG = {
  clicks: 3,
  /** The clicks must all land within this long */
  windowMs: 1_200,
  /** How far the date pretends to slip */
  slipMs: 365 * 86_400_000,
  delayed: { label: "Delayed again", ms: 2_600 },
  kidding: { label: "Just kidding", ms: 1_800 },
} as const;

export type DelayGagPhase = "delayed" | "kidding";

/** The joke's current phase (null when it isn't running) and the click counter that sets it off. */
export function useDelayGag() {
  const [phase, setPhase] = useState<DelayGagPhase | null>(null);
  const clicks = useRef<number[]>([]);

  useEffect(() => {
    if (phase === null) return;
    const timer = setTimeout(
      () => setPhase(phase === "delayed" ? "kidding" : null),
      DELAY_GAG[phase].ms,
    );
    return () => clearTimeout(timer);
  }, [phase]);

  function registerClick() {
    if (phase !== null) return;
    const now = performance.now();
    clicks.current = [...clicks.current.filter((time) => now - time < DELAY_GAG.windowMs), now];
    if (clicks.current.length < DELAY_GAG.clicks) return;
    clicks.current = [];
    setPhase("delayed");
  }

  return { phase, registerClick };
}
