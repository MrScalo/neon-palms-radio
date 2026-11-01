import { useState, type CSSProperties } from "react";
import type { Slot, Station } from "@/lib/radio/types";
import { formatClock, slotKey } from "./format";

type NowPlayingProps = {
  station: Station;
  current: Slot | null;
  elapsed: number;
  /** True while this visitor hears the music; animates the level meter. */
  live: boolean;
};

const EQ_BARS = [
  { duration: 0.82, delay: -0.3 },
  { duration: 0.64, delay: -0.1 },
  { duration: 0.95, delay: -0.5 },
  { duration: 0.71, delay: -0.2 },
  { duration: 0.88, delay: -0.65 },
];

function LevelMeter({ live }: { live: boolean }) {
  return (
    <span aria-hidden="true" data-live={live} className="flex h-4 shrink-0 items-end gap-[3px]">
      {EQ_BARS.map((bar, i) => (
        <span
          key={i}
          className={`np-eq-bar h-full w-[3px] rounded-full ${live ? "bg-neon-cyan" : "bg-plum"}`}
          style={{ "--np-eq-duration": `${bar.duration}s`, "--np-eq-delay": `${bar.delay}s` } as CSSProperties}
        />
      ))}
    </span>
  );
}

export function NowPlaying({ station, current, elapsed, live }: NowPlayingProps) {
  const track = current?.track ?? null;
  const duration = track?.duration ?? 0;
  const progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 0;
  // Decided per station, so the panel doesn't jump between songs with and without a note.
  const notesHeardIn = station.tracks.some((item) => item.heardIn);

  // Spoken only when the song changes on the same station. A switch is announced once, by the
  // tuner, and the first song after loading isn't news either.
  const key = current ? slotKey(current) : null;
  const [heard, setHeard] = useState({ stationId: station.id, key, spoken: "" });
  if (heard.stationId !== station.id || heard.key !== key) {
    const newSong = heard.stationId === station.id && heard.key !== null && track !== null;
    setHeard({
      stationId: station.id,
      key,
      spoken: newSong ? `Now playing: ${track.title} by ${track.artist}` : heard.spoken,
    });
  }

  return (
    <section aria-labelledby="np-now-heading" className="np-panel p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <h2 id="np-now-heading" className="shrink-0 font-display text-xs tracking-[0.24em] text-hot-pink uppercase">
          Now playing
        </h2>
        <p className="min-w-0 flex-1 truncate text-right font-lcd text-lg leading-none text-station-soft">
          <span className="sr-only">on </span>
          {station.name} {station.frequency}
          <span className="sr-only"> FM</span>
        </p>
        <LevelMeter live={live} />
      </div>

      {/* Only a new song is announced; the ticking clock below stays quiet. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {heard.spoken}
      </p>
      <div className="mt-4">
        {/* Keyed by station, so a switch fades the new song in. */}
        <div key={station.id} className="np-swap-in">
          {track ? (
            <>
              <p className="flex min-h-[2.2em] items-end text-[1.625rem] leading-[1.1] font-semibold tracking-tight text-cream [text-shadow:0_0_22px_rgb(255_47_160/0.35)] sm:text-[1.875rem]">
                <span className="line-clamp-2">{track.title}</span>
              </p>
              <p className="mt-2 flex h-7 items-center gap-3 text-lg leading-none text-hot-pink">
                <span className="truncate">{track.artist}</span>
                <span className="np-lcd shrink-0 rounded px-1.5 pt-px font-lcd text-lg leading-6">
                  <span className="sr-only">Released </span>
                  {track.year}
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="flex min-h-[2.2em] items-end text-[1.625rem] leading-[1.1] sm:text-[1.875rem]">
                <span className="sr-only">Finding the current song</span>
                <span aria-hidden="true" className="block h-[0.85em] w-3/4 motion-safe:animate-pulse rounded-md bg-plum/80" />
              </p>
              <p aria-hidden="true" className="mt-2 flex h-7 items-center gap-3">
                <span className="block h-4 w-28 motion-safe:animate-pulse rounded bg-plum/70" />
                <span className="block h-5 w-12 motion-safe:animate-pulse rounded bg-plum/60" />
              </p>
            </>
          )}
        </div>
      </div>

      {notesHeardIn && (
        <p className="mt-3 flex h-6 items-center">
          {track?.heardIn ? (
            <span className="inline-flex h-6 max-w-full items-center gap-2 rounded-full border border-station/45 bg-station/10 px-2.5 text-xs leading-none text-cream/90">
              <span className="shrink-0 font-display text-[0.625rem] tracking-[0.18em] text-station-soft uppercase">
                As heard<span className="sr-only">:</span>
              </span>
              <span className="truncate">{track.heardIn}</span>
            </span>
          ) : null}
        </p>
      )}

      <p className="mt-2 h-5 truncate text-sm leading-5 text-muted">
        {track ? `Official video via ${track.channel}` : null}
      </p>

      <div aria-hidden="true" className="mt-5 h-1.5 overflow-hidden rounded-full bg-plum/70">
        <div
          key={current ? slotKey(current) : "idle"}
          className="np-progress-fill h-full w-full rounded-full transition-transform duration-1000 ease-linear motion-reduce:transition-none"
          style={{ transform: `translateX(${(progress - 1) * 100}%)` }}
        />
      </div>
      <div className="mt-2 flex justify-between font-lcd text-xl leading-none text-neon-cyan">
        <span>
          <span className="sr-only">Elapsed </span>
          {track ? formatClock(elapsed) : "-:--"}
        </span>
        <span>
          <span className="sr-only">Length </span>
          {track ? formatClock(duration) : "-:--"}
        </span>
      </div>
    </section>
  );
}
