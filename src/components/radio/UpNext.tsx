import Link from "next/link";
import type { Slot, Station } from "@/lib/radio/types";
import { formatClock, secondsUntil, slotKey } from "./format";

type UpNextProps = {
  station: Station;
  current: Slot | null;
  upcoming: Slot[];
  elapsed: number;
};

const PLACEHOLDER_ROWS = 3;

export function UpNext({ station, current, upcoming, elapsed }: UpNextProps) {
  const ready = current !== null && upcoming.length > 0;

  return (
    <section aria-labelledby="np-next-heading" className="np-panel px-5 pt-5 pb-2 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="np-next-heading" className="font-display text-base text-cream">
          Up next
        </h2>
        <Link
          href={`/rotation#${station.id}`}
          className="-my-1 inline-flex h-8 items-center text-sm whitespace-nowrap text-neon-cyan underline decoration-neon-cyan/50 underline-offset-4 transition-colors hover:decoration-neon-cyan"
        >
          Full rotation
          <span className="sr-only"> of {station.name}</span>
        </Link>
      </div>
      <ol key={station.id} className="np-swap-in mt-2 divide-y divide-plum/70">
        {ready
          ? upcoming.map((slot) => (
              <li key={slotKey(slot)} className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3 py-3">
                <span className="font-lcd text-xl leading-none whitespace-nowrap text-neon-cyan">
                  in {formatClock(secondsUntil(slot, current, elapsed))}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-cream">{slot.track.title}</span>
                  <span className="block truncate text-sm text-muted">
                    {slot.track.artist}
                    {slot.track.heardIn ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="mx-2 inline-block size-1 rotate-45 bg-station/70 align-middle"
                        />
                        <span className="sr-only">, as heard: </span>
                        <span className="text-station-soft/80">{slot.track.heardIn}</span>
                      </>
                    ) : null}
                  </span>
                </span>
              </li>
            ))
          : Array.from({ length: PLACEHOLDER_ROWS }, (_, i) => (
              <li key={i} aria-hidden="true" className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-center gap-3 py-3">
                <span className="block h-4 w-14 rounded bg-plum/70 motion-safe:animate-pulse" />
                <span className="block">
                  <span className="block h-[1.5rem] py-1">
                    <span className="block h-full w-2/3 rounded bg-plum/70 motion-safe:animate-pulse" />
                  </span>
                  <span className="block h-5 py-1">
                    <span className="block h-full w-1/3 rounded bg-plum/50 motion-safe:animate-pulse" />
                  </span>
                </span>
              </li>
            ))}
      </ol>
    </section>
  );
}
