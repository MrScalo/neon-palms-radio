"use client";

import Link from "next/link";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { InstagramIcon } from "@/components/radio/icons";
import { FAN_PROJECT_DISCLAIMER, site } from "@/config/site";
import { useYouTubeConsent, type ConsentState } from "@/lib/consent";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/rotation", label: "Rotation" },
  { href: "/privacy", label: "Privacy" },
  { href: "/imprint", label: "Legal notice" },
] as const;

const NAV_LINK =
  "text-cream underline-offset-4 transition-colors hover:text-neon-cyan hover:underline focus-visible:text-neon-cyan";

const STATUS: Record<ConsentState, { label: string; dot: string; detail: string }> = {
  granted: {
    label: "Allowed",
    dot: "bg-neon-cyan shadow-[0_0_8px_var(--color-neon-cyan)]",
    detail:
      "You allowed the YouTube player. Tuning in loads YouTube’s player script from youtube.com and the player from youtube-nocookie.com.",
  },
  denied: {
    label: "Not allowed",
    dot: "bg-sunset-orange",
    detail:
      "You chose “Not now”, so nothing is loaded from YouTube. Tuning in will ask you again.",
  },
  unknown: {
    label: "Not decided",
    dot: "bg-muted",
    detail:
      "Nothing is loaded from YouTube until you click “Accept & tune in” on the radio.",
  },
};

const subscribeNever = () => () => {};

// The copyright year is read on the client only: under cacheComponents a server-side
// `new Date()` would make the prerendered shell time-dependent.
function useCurrentYear(): number {
  return useSyncExternalStore(
    subscribeNever,
    () => new Date().getFullYear(),
    () => 2026,
  );
}

export function SiteFooter() {
  const { consent, revoke } = useYouTubeConsent();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const year = useCurrentYear();
  const status = STATUS[consent];

  function togglePanel() {
    setOpen((value) => !value);
    setNotice(null);
  }

  function withdraw() {
    const wasGranted = consent === "granted";
    revoke();
    // The withdraw button disappears with the decision, so keep keyboard focus in the footer.
    toggleRef.current?.focus();
    setNotice(
      wasGranted
        ? "Done — your consent is withdrawn. The YouTube player has been switched off and won’t load again unless you accept it the next time you tune in. Cookies YouTube already stored stay in your browser until you delete them there."
        : "Done — your choice has been deleted from this browser.",
    );
  }

  return (
    <footer className="mt-auto border-t border-plum bg-dusk/60">
      <div
        aria-hidden="true"
        className="h-px bg-linear-to-r from-transparent via-neon-pink to-transparent opacity-70"
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl space-y-3 text-sm leading-relaxed text-muted">
            <p className="font-display text-xs tracking-[0.2em] text-hot-pink uppercase">
              {site.name}
            </p>
            <p>{FAN_PROJECT_DISCLAIMER}</p>
            <p>
              Music videos are embedded from the official YouTube channels of the respective
              artists and labels. All rights remain with their owners.
            </p>
          </div>

          <nav aria-label="Footer" className="shrink-0">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 font-display text-xs tracking-[0.15em] uppercase md:flex-col md:items-end">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={NAV_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={NAV_LINK}
                >
                  YouTube Terms
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
              <li>
                <button
                  ref={toggleRef}
                  type="button"
                  onClick={togglePanel}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="inline-flex cursor-pointer items-center gap-2 uppercase tracking-[0.15em] text-cream underline-offset-4 transition-colors hover:text-neon-cyan hover:underline focus-visible:text-neon-cyan"
                >
                  <span aria-hidden="true" className={`size-2 rounded-full ${status.dot}`} />
                  Privacy settings
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Rendered inline (never as a floating popover) so it can't cover the video player. */}
        <section
          id={panelId}
          hidden={!open}
          aria-label="Privacy settings"
          className="rounded-xl border border-plum bg-ink/80 p-5 text-sm leading-relaxed"
        >
          <h2 className="font-display text-sm tracking-[0.15em] text-cream uppercase">
            Privacy settings
          </h2>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-cream">
            <span className="text-muted">YouTube player:</span>
            <span className="inline-flex items-center gap-2 font-semibold">
              <span aria-hidden="true" className={`size-2 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </p>
          <p className="mt-2 text-muted">{status.detail}</p>

          {consent !== "unknown" && (
            <button
              type="button"
              onClick={withdraw}
              className="mt-4 cursor-pointer rounded-full border border-neon-pink px-4 py-2 font-display text-xs tracking-[0.15em] text-cream uppercase transition hover:bg-neon-pink/15 hover:shadow-[0_0_16px_rgb(255_47_160/0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan"
            >
              {consent === "granted" ? "Withdraw consent" : "Forget my choice"}
            </button>
          )}

          <div role="status">
            {notice && <p className="mt-3 text-neon-cyan">{notice}</p>}
          </div>

          <p className="mt-4 text-muted">
            Details in our{" "}
            <Link href="/privacy" className="text-neon-cyan underline underline-offset-4">
              privacy policy
            </Link>
            .
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-xs text-muted/80">
          <p>© {year} {site.name} · A fan project · No ads, tracking or cookies of our own.</p>
          <a
            href={site.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-hot-pink focus-visible:text-hot-pink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan"
          >
            <InstagramIcon className="size-4" />
            <span className="sr-only">Instagram: </span>
            {site.instagram.handle}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
