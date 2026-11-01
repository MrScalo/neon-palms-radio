import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { LegalPage } from "@/components/legal/LegalPage";
import { site } from "@/config/site";
import { STATIONS } from "@/config/stations";
import type { Station, Track } from "@/lib/radio/types";

export const metadata: Metadata = {
  title: `The Rotation · ${site.name}`,
  description: `Every song on every ${site.name} station, all official uploads by the artists and labels.`,
};

const STAT_LABEL = "font-display text-[0.65rem] tracking-[0.2em] text-muted uppercase";

function sortByArtist(tracks: readonly Track[]): Track[] {
  return [...tracks].sort(
    (a, b) =>
      a.artist.localeCompare(b.artist, "en", { sensitivity: "base" }) ||
      a.year - b.year ||
      a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
  );
}

function formatTrackLength(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatRuntime(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

/** Exposes the station colour as `--accent` for the `*-(--accent)` utilities below. */
function accentStyle(station: Station): CSSProperties {
  return { "--accent": station.accent } as CSSProperties;
}

function StationPresets() {
  return (
    <nav aria-label="Stations">
      <ul className="grid gap-3 sm:grid-cols-3">
        {STATIONS.map((station, index) => (
          <li key={station.id} style={accentStyle(station)}>
            <a
              href={`#${station.id}`}
              className="flex h-full flex-col gap-1 rounded-lg border border-plum bg-dusk px-4 py-3 transition-colors hover:border-(--accent) focus-visible:border-(--accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display text-sm text-cream">{station.name}</span>
                <span className="font-lcd text-xl leading-none text-(--accent)">
                  {station.frequency}
                </span>
              </span>
              <span className="text-sm text-muted">
                <span className="sr-only">Preset </span>
                <span aria-hidden="true">P</span>
                {index + 1} · {station.tagline}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TrackItem({ track }: { track: Track }) {
  return (
    <li className="grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[1fr_auto] sm:items-baseline">
      <div className="min-w-0">
        <p className="font-display text-sm tracking-wide text-hot-pink">{track.artist}</p>
        <p className="mt-1 text-lg font-medium text-cream">{track.title}</p>
        <p className="mt-1 text-sm text-muted">
          Official upload: <span className="text-cream/90">{track.channel}</span>
        </p>
        {track.officialNote && <p className="mt-1 text-xs text-muted/80">{track.officialNote}</p>}
        {track.heardIn && (
          <p className="mt-2 flex w-fit items-center gap-2 rounded-full border border-plum px-2.5 py-0.5 text-xs text-muted">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-(--accent)" />
            <span>
              <span className="sr-only">Heard in: </span>
              {track.heardIn}
            </span>
          </p>
        )}
      </div>
      <div className="flex items-baseline gap-4 sm:flex-col sm:items-end sm:gap-1">
        <p className="font-lcd text-xl leading-none text-sunset-yellow">
          {track.year}
          <span className="text-muted"> · </span>
          <span className="text-cream/80">
            <span className="sr-only">length </span>
            {formatTrackLength(track.duration)}
          </span>
        </p>
        <a
          href={`https://www.youtube.com/watch?v=${track.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-neon-cyan underline decoration-neon-cyan/50 underline-offset-4 transition-colors hover:decoration-neon-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan"
        >
          Watch on YouTube
          <span className="sr-only">
            : {track.artist} – {track.title} (opens in a new tab)
          </span>
        </a>
      </div>
    </li>
  );
}

function StationSection({ station }: { station: Station }) {
  const tracks = sortByArtist(station.tracks);
  const totalSeconds = tracks.reduce((sum, track) => sum + track.duration, 0);
  const trackLabel = tracks.length === 1 ? "track" : "tracks";
  const headingId = `${station.id}-name`;

  return (
    <section
      id={station.id}
      aria-labelledby={headingId}
      style={accentStyle(station)}
      className="mt-16 scroll-mt-6"
    >
      <div
        aria-hidden="true"
        className="h-0.5 rounded-full bg-(--accent) opacity-80 shadow-[0_0_12px_var(--accent)]"
      />
      <p className="mt-6 font-lcd text-2xl leading-none text-(--accent)">
        {station.frequency} <span className="text-muted">FM</span>
      </p>
      <h2 id={headingId} className="mt-2 font-display text-2xl text-cream sm:text-3xl">
        {station.name}
      </h2>
      <p className="mt-2 font-display text-sm tracking-wide text-(--accent)">{station.tagline}</p>
      <p className="mt-3 max-w-2xl leading-relaxed text-cream/90">{station.description}</p>

      <dl className="mt-6 flex flex-wrap gap-3">
        <div className="rounded-lg border border-plum bg-dusk px-4 py-2">
          <dt className={STAT_LABEL}>In rotation</dt>
          <dd className="font-lcd text-3xl leading-none text-sunset-yellow">
            {tracks.length} {trackLabel}
          </dd>
        </div>
        <div className="rounded-lg border border-plum bg-dusk px-4 py-2">
          <dt className={STAT_LABEL}>Total runtime</dt>
          <dd className="font-lcd text-3xl leading-none text-neon-cyan">
            {formatRuntime(totalSeconds)}
          </dd>
        </div>
      </dl>

      <h3 className="mt-8 font-display text-xs tracking-[0.2em] text-muted uppercase">
        {station.name} · A–Z by artist
      </h3>
      <ul className="mt-4 divide-y divide-plum border-y border-plum">
        {tracks.map((track) => (
          <TrackItem key={track.id} track={track} />
        ))}
      </ul>
    </section>
  );
}

export default function RotationPage() {
  return (
    <LegalPage
      eyebrow="Stations · Playlists"
      title="The Rotation"
      prose={false}
      lead={
        <>
          <p>
            Every song on {site.name}. Three stations, each with its own shuffled rotation: a
            station plays its whole list, then shuffles it into a different order for the next
            cycle — and everyone on the same station hears the same song at the same time, just
            like real radio.
          </p>
          <p className="mt-3 text-base">
            All videos are official uploads by the artists or their labels. The links below
            open YouTube in a new tab; nothing is loaded from YouTube on this page.
          </p>
        </>
      }
    >
      <StationPresets />
      {STATIONS.map((station) => (
        <StationSection key={station.id} station={station} />
      ))}
    </LegalPage>
  );
}
