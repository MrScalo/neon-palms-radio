import { useState } from "react";
import type { RadioStatus } from "@/lib/radio/types";
import { formatClock } from "./format";

type StatusLineProps = {
  status: RadioStatus;
  /** Seconds until the current track ends (the next one is where a lost signal comes back). */
  remaining: number;
  /** The programme changed since this page loaded; only a reload brings it back in step with everyone. */
  stationUpdated: boolean;
  onResume(): void;
  className?: string;
};

const actionClass =
  "ml-1 inline-flex h-9 items-center rounded-full border border-neon-cyan/80 px-4 font-display text-[0.75rem] tracking-[0.14em] whitespace-nowrap text-neon-cyan uppercase transition-[background-color,box-shadow] hover:bg-neon-cyan/10 hover:shadow-[0_0_16px_rgb(34_230_255/0.35)] active:translate-y-px";

function message(status: RadioStatus, remaining: number, onResume: () => void) {
  switch (status) {
    case "off":
      return "The station is on air. Tune in to listen live.";
    case "connecting":
      return "Connecting to the live broadcast…";
    case "playing":
      return "Live and in sync with every listener.";
    case "buffering":
      return "Catching the signal…";
    case "needs-gesture":
      return (
        <>
          <span>Your browser is holding the sound back.</span>
          <button type="button" onClick={onResume} className={actionClass}>
            Tap to start the sound
          </button>
        </>
      );
    case "paused":
      return (
        <>
          <span>Paused. The station kept playing.</span>
          <button type="button" onClick={onResume} className={actionClass}>
            Back to live
          </button>
        </>
      );
    case "signal-lost":
      return (
        <span>
          Signal lost. Back with the next track
          {/* The countdown ticks every second, so screen readers get a calm version instead. */}
          <span aria-hidden="true"> in {formatClock(remaining)}</span>
          <span className="sr-only"> shortly</span>.
        </span>
      );
  }
}

/** What screen readers hear; null keeps the previous message. */
function spokenMessage(status: RadioStatus, stationUpdated: boolean): string | null {
  if (stationUpdated) return "The stations have been updated. Re-tune to catch up.";
  switch (status) {
    case "off":
      return "The station is on air. Tune in to listen live.";
    case "connecting":
      return "Connecting to the live broadcast…";
    case "playing":
      return "Live and in sync with every listener.";
    case "buffering":
      // Every station switch buffers for a moment; only a lasting dropout (signal-lost) is news.
      return null;
    case "needs-gesture":
      return "Your browser is holding the sound back. Tap to start the sound.";
    case "paused":
      return "Paused. The station kept playing.";
    case "signal-lost":
      return "Signal lost. Back with the next track shortly.";
  }
}

export function StatusLine({ status, remaining, stationUpdated, onResume, className }: StatusLineProps) {
  const next = spokenMessage(status, stationUpdated);
  const [spoken, setSpoken] = useState(next ?? "");
  if (next !== null && next !== spoken) setSpoken(next);

  return (
    <div
      className={`flex min-h-11 flex-wrap items-center gap-x-2 gap-y-2 text-sm leading-snug text-muted ${className ?? ""}`}
    >
      <p role="status" className="sr-only">
        {spoken}
      </p>
      {stationUpdated ? (
        <>
          <span>The stations have been updated.</span>
          {/* Never reloaded automatically: that would drop the click that lets the music play with sound. */}
          <button type="button" className={actionClass} onClick={() => window.location.reload()}>
            Re-tune
          </button>
        </>
      ) : (
        message(status, remaining, onResume)
      )}
    </div>
  );
}
