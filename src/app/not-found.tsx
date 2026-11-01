import type { Metadata } from "next";
import Link from "next/link";
import { StationWordmark } from "@/components/legal/LegalPage";
import { SiteFooter } from "@/components/legal/SiteFooter";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: `Dead air · ${site.name}`,
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        <StationWordmark />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div aria-hidden="true" className="relative h-28 w-full max-w-md">
          <div className="absolute bottom-0 left-1/2 h-24 w-48 -translate-x-1/2 rounded-t-full bg-linear-to-b from-sunset-yellow via-sunset-orange to-neon-pink opacity-80 [mask-image:repeating-linear-gradient(to_bottom,#000_0_12px,transparent_12px_16px)]" />
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-neon-cyan shadow-[0_0_12px_var(--color-neon-cyan)] motion-safe:animate-pulse" />
        </div>

        <p className="mt-8 inline-flex items-center gap-3 rounded-md border border-plum bg-dusk px-4 py-1.5 font-lcd text-2xl text-sunset-yellow">
          <span className="text-on-air">
            <span aria-hidden="true">● </span>No signal
          </span>
          <span aria-hidden="true" className="text-muted">
            |
          </span>
          404.0 FM
        </p>

        <h1 className="mt-6 font-display text-4xl text-cream [text-shadow:0_0_12px_rgb(255_47_160/0.8),0_0_32px_rgb(255_47_160/0.45)] sm:text-6xl">
          Dead air.
        </h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
          Nothing is broadcasting on this frequency. The page you tuned in to doesn’t exist — or
          it drifted off into the night.
        </p>

        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-neon-pink bg-neon-pink/10 px-6 py-3 font-display text-sm tracking-[0.15em] text-cream uppercase shadow-[0_0_20px_rgb(255_47_160/0.35)] transition hover:bg-neon-pink/20 hover:shadow-[0_0_28px_rgb(255_47_160/0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon-cyan"
        >
          ← Tune back to {site.frequency}
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
