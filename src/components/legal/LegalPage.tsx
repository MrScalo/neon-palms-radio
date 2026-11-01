import Link from "next/link";
import type { ReactNode } from "react";
import { isOperatorConfigured, isPlaceholder, site } from "@/config/site";
import { SiteFooter } from "./SiteFooter";

// Block rules target direct children only, so nested custom blocks (boxes, navs) keep their own
// spacing; inline rules (links, emphasis, code) apply at any depth.
const PROSE = [
  "text-base leading-relaxed text-cream/90",
  "[&>h2]:mt-12 [&>h2]:mb-4 [&>h2]:scroll-mt-6 [&>h2]:font-display [&>h2]:text-xl [&>h2]:text-hot-pink sm:[&>h2]:text-2xl",
  "[&>h3]:mt-8 [&>h3]:mb-3 [&>h3]:font-display [&>h3]:text-base [&>h3]:text-neon-cyan",
  "[&>p]:my-4 [&>address]:my-4 [&>address]:not-italic",
  "[&>ul]:my-4 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-6 [&>ul>li]:marker:text-neon-pink",
  "[&_strong]:font-semibold [&_strong]:text-cream",
  "[&_a]:text-neon-cyan [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-neon-cyan/50 [&_a:hover]:decoration-neon-cyan",
  "[&_code]:rounded [&_code]:bg-dusk [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-lcd [&_code]:text-lg [&_code]:text-sunset-yellow",
].join(" ");

/** Small neon script wordmark that links back to the station. */
export function StationWordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-baseline gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon-cyan ${className}`}
    >
      <span className="font-script text-3xl leading-none text-hot-pink [text-shadow:0_0_6px_rgb(255_47_160/0.9),0_0_22px_rgb(255_47_160/0.55)] sm:text-4xl">
        {site.name}
      </span>
      <span className="font-lcd text-xl leading-none text-sunset-yellow">{site.frequency}</span>
    </Link>
  );
}

/** Shown on the legal pages until the operator placeholders in src/config/site.ts are filled in. */
export function PlaceholderWarning() {
  if (isOperatorConfigured) return null;
  return (
    <p
      role="note"
      className="my-6 rounded-lg border border-sunset-orange/60 bg-sunset-orange/10 px-4 py-3 text-sm text-sunset-yellow"
    >
      Draft: the operator and hosting details on this page are still placeholders and must be
      completed before the site goes public.
    </p>
  );
}

/** Postal address of the operator (controller / provider). */
export function OperatorAddress() {
  const { name, street, postalCity, country } = site.operator;
  return (
    <address>
      <strong>{name}</strong>
      <br />
      {street}
      <br />
      {postalCity}
      <br />
      {country}
    </address>
  );
}

/** The operator's email — only a mailto link once it is a real address. */
export function ContactEmail() {
  const { email } = site.operator;
  if (isPlaceholder(email)) return <span>{email}</span>;
  return <a href={`mailto:${email}`}>{email}</a>;
}

type LegalPageProps = {
  /** Small label above the title, e.g. "Legal". */
  eyebrow?: string;
  title: string;
  /** Optional lead paragraph under the title. */
  lead?: ReactNode;
  /** Applies the text-page typography to the children. Disable for custom layouts. */
  prose?: boolean;
  children: ReactNode;
};

export function LegalPage({ eyebrow, title, lead, prose = true, children }: LegalPageProps) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="relative overflow-hidden border-b border-plum">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-neon-pink/15 via-sunset-orange/5 to-transparent"
        />
        <div className="relative mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <StationWordmark />
          <Link
            href="/"
            className="font-display text-xs tracking-[0.15em] text-cream uppercase underline-offset-4 transition-colors hover:text-neon-cyan hover:underline focus-visible:text-neon-cyan"
          >
            ← Back to the station
          </Link>
        </div>
        <div
          aria-hidden="true"
          className="h-0.5 bg-linear-to-r from-violet via-neon-pink to-sunset-orange"
        />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {eyebrow && (
          <p className="font-display text-xs tracking-[0.3em] text-sunset-orange uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-3xl leading-tight text-cream [text-shadow:0_0_18px_rgb(139_92_246/0.6)] sm:text-4xl">
          {title}
        </h1>
        {lead && <div className="mt-4 text-lg leading-relaxed text-muted">{lead}</div>}
        <div className={prose ? `mt-8 ${PROSE}` : "mt-8"}>{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}
