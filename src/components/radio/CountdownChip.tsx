import type { CSSProperties } from "react";
import { COUNTDOWN } from "@/config/countdown";
import { getStation } from "@/config/stations";
import { useStationNow } from "@/lib/radio/clock";
import { countdownTarget, describeCountdown, formatCountdown } from "./countdown";

const STATION = getStation(COUNTDOWN.stationId);
// Same character count as "17d 04:12:33", so nothing moves once the clock is known.
const PLACEHOLDER = "--d --:--:--";

type CountdownChipProps = {
  /** The countdown's station is the selected one */
  tuned: boolean;
  /** Selects the countdown's station, the same way its preset does */
  onTune(): void;
  className?: string;
};

/** Days left to the big return, next to the station display. Tunes to its station on click. */
export function CountdownChip({ tuned, onTune, className = "" }: CountdownChipProps) {
  // The radio's own one-second tick; null on the server and while hydrating.
  const now = useStationNow(1000);
  const msLeft = now === null ? null : countdownTarget() - now;
  const state = msLeft === null ? null : formatCountdown(msLeft);
  if (state?.kind === "hidden") return null;

  const action = tuned ? `Now on ${STATION.name}` : `Tune to ${STATION.name}`;
  const spoken =
    state === null || msLeft === null
      ? action
      : state.kind === "out-now"
        ? `${COUNTDOWN.outNowLabel}. ${action}`
        : `${COUNTDOWN.label} ${describeCountdown(msLeft)}. ${action}`;

  return (
    <button
      type="button"
      onClick={onTune}
      aria-label={spoken}
      className={`np-lcd np-countdown flex h-7 w-fit max-w-full items-center gap-2 rounded-md px-2 pt-px font-lcd leading-none ${className}`}
      style={{ "--countdown-accent": STATION.accent } as CSSProperties}
    >
      {state?.kind === "out-now" ? (
        <span className="text-[1.125rem] tracking-[0.12em] uppercase">{COUNTDOWN.outNowLabel}</span>
      ) : (
        <>
          <span className="np-countdown-label min-w-0 truncate text-[0.9375rem] tracking-[0.06em] uppercase max-[359px]:text-[0.875rem] max-[359px]:tracking-[0.02em]">
            {COUNTDOWN.label}
          </span>
          <span className="shrink-0 text-[1.25rem] tabular-nums" data-placeholder={state === null}>
            {state === null ? PLACEHOLDER : state.text}
          </span>
        </>
      )}
    </button>
  );
}
