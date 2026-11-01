import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { site } from "@/config/site";
import playlist from "@/data/playlist.json";
import type { Track } from "@/lib/radio/types";

export const metadata: Metadata = {
  title: `The Rotation · ${site.name}`,
  description: `Every song on ${site.name}, all official uploads by the artists and labels.`,
};

const tracks: readonly Track[] = playlist.tracks;

const byArtist = [...tracks].sort(
  (a, b) =>
    a.artist.localeCompare(b.artist, "en", { sensitivity: "base" }) ||
    a.year - b.year ||
    a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
);

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

export default function RotationPage() {
  const totalSeconds = tracks.reduce((sum, track) => sum + track.duration, 0);
  const trackLabel = tracks.length === 1 ? "track" : "tracks";

  return (
    <LegalPage
      eyebrow={`${site.frequency} · Playlist`}
      title="The Rotation"
      prose={false}
      lead={
        <>
          <p>
            Every song on {site.name}. The station plays the whole rotation, then shuffles it
            into a different order for the next cycle — and every listener hears the same song
            at the same time, just like real radio.
          </p>
          <p className="mt-3 text-base">
            All videos are official uploads by the artists or their labels. The links below
            open YouTube in a new tab; nothing is loaded from YouTube on this page.
          </p>
        </>
      }
    >
      <dl className="flex flex-wrap gap-3">
        <div className="rounded-lg border border-plum bg-dusk px-4 py-2">
          <dt className="font-display text-[0.65rem] tracking-[0.2em] text-muted uppercase">
            In rotation
          </dt>
          <dd className="font-lcd text-3xl leading-none text-sunset-yellow">
            {tracks.length} {trackLabel}
          </dd>
        </div>
        <div className="rounded-lg border border-plum bg-dusk px-4 py-2">
          <dt className="font-display text-[0.65rem] tracking-[0.2em] text-muted uppercase">
            Total runtime
          </dt>
          <dd className="font-lcd text-3xl leading-none text-neon-cyan">
            {formatRuntime(totalSeconds)}
          </dd>
        </div>
      </dl>

      <h2 className="mt-10 font-display text-xs tracking-[0.2em] text-muted uppercase">
        All tracks · A–Z by artist
      </h2>
      <ul className="mt-4 divide-y divide-plum border-y border-plum">
        {byArtist.map((track) => (
          <li
            key={track.id}
            className="grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[1fr_auto] sm:items-baseline"
          >
            <div className="min-w-0">
              <p className="font-display text-sm tracking-wide text-hot-pink">{track.artist}</p>
              <p className="mt-1 text-lg font-medium text-cream">{track.title}</p>
              <p className="mt-1 text-sm text-muted">
                Official upload: <span className="text-cream/90">{track.channel}</span>
              </p>
              {track.officialNote && (
                <p className="mt-1 text-xs text-muted/80">{track.officialNote}</p>
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
        ))}
      </ul>
    </LegalPage>
  );
}
