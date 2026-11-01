import Link from "next/link";
import type { RefObject } from "react";
import type { ConsentState } from "@/lib/consent";
import { PowerIcon } from "./icons";

type ConsentCardProps = {
  consent: ConsentState;
  onAccept(): void;
  onDecline(): void;
  acceptRef: RefObject<HTMLButtonElement | null>;
  /** Bumped when the power button sends the visitor here; replays the highlight ring. */
  nudge: number;
};

const linkClass = "text-neon-cyan underline decoration-neon-cyan/50 underline-offset-4 hover:decoration-neon-cyan";

/** Placeholder for the player until the visitor agrees to load YouTube. Nothing third-party loads before. */
export function ConsentCard({ consent, onAccept, onDecline, acceptRef, nudge }: ConsentCardProps) {
  const declined = consent === "denied";

  return (
    <div
      role="group"
      aria-labelledby="np-consent-heading"
      className="relative flex flex-1 flex-col justify-center px-4 py-5 sm:px-8 sm:py-6"
    >
      <div className="mx-auto w-full max-w-xl">
        <h3 id="np-consent-heading" className="font-display text-base leading-snug text-cream sm:text-lg">
          {declined ? "The player is off for now" : "Play the music through YouTube?"}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-cream/90">
          {declined
            ? "No problem, nothing has been loaded from YouTube. The stations keep running below, and you can switch the sound on whenever you like."
            : "Every song on Neon Palms Radio plays in an embedded YouTube player. Nothing loads from YouTube until you click."}
        </p>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted sm:text-sm">
          Clicking loads YouTube’s player script from youtube.com and the player in privacy-enhanced mode from
          youtube-nocookie.com (Google Ireland Limited). Google may process your IP address, set and read cookies
          (also on youtube.com), show ads in the player and transfer data to the USA. By tuning in you agree to the{" "}
          {/* A plain link: nothing loads from YouTube until it is clicked. */}
          <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className={linkClass}>
            YouTube Terms of Service
          </a>
          . You can withdraw your consent anytime via “Privacy settings” at the bottom of the page.{" "}
          <Link href="/privacy" className={linkClass}>
            Privacy policy
          </Link>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="relative inline-flex">
            <button
              ref={acceptRef}
              type="button"
              onClick={onAccept}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-neon-pink pr-5 pl-4 font-display text-[0.8125rem] tracking-[0.12em] whitespace-nowrap text-ink uppercase shadow-[0_0_24px_rgb(255_47_160/0.5)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-hot-pink hover:shadow-[0_0_32px_rgb(255_47_160/0.7)] active:translate-y-px"
            >
              <PowerIcon className="size-4" />
              Accept &amp; tune in
            </button>
            {nudge > 0 && <span key={nudge} aria-hidden="true" className="np-nudge" />}
          </span>
          {!declined && (
            <button
              type="button"
              onClick={onDecline}
              className="inline-flex h-11 items-center rounded-full border border-plum px-5 font-display text-[0.8125rem] tracking-[0.12em] whitespace-nowrap text-cream uppercase transition-colors hover:border-muted active:translate-y-px"
            >
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
