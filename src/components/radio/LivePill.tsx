import { formatCount } from "./format";
import { HeadphonesIcon } from "./icons";

type LivePillProps = {
  live: boolean;
  /** Everyone tuned in across the network; null hides the count. */
  listeners: number | null;
};

/** Lights up while this visitor is actually listening (status "playing"). */
export function LivePill({ live, listeners }: LivePillProps) {
  return (
    <p
      data-live={live}
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3.5 font-display text-[0.75rem] leading-none tracking-[0.18em] whitespace-nowrap uppercase transition-[color,border-color,background-color,box-shadow] duration-500 ${
        live
          ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan shadow-[0_0_18px_rgb(34_230_255/0.45)]"
          : "border-plum bg-ink/60 text-muted"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-2 rounded-full transition-[background-color,box-shadow] duration-500 ${
          live ? "bg-neon-cyan shadow-[0_0_10px_var(--color-neon-cyan)]" : "border border-muted/70"
        }`}
      />
      {listeners !== null ? (
        <>
          {/* Lit means "you're tuned in"; the words below say how many are. */}
          <span className="sr-only">{live ? "You're tuned in. " : "Not tuned in. "}</span>
          Live
          <span aria-hidden="true" className="h-3.5 w-px bg-current opacity-40" />
          <span>
            <HeadphonesIcon className="mr-1.5 inline-block size-3.5 align-[-0.2em]" />
            <span className="font-lcd text-[1.0625rem] tracking-normal tabular-nums">{formatCount(listeners)}</span>{" "}
            {/* Spelled out where the header has room; the headphones stand in for it elsewhere. */}
            <span className="sr-only lg:not-sr-only">tuned in</span>
          </span>
        </>
      ) : live ? (
        "Tuned in · Live"
      ) : (
        <>
          <span className="sr-only">Not tuned in. </span>Live
        </>
      )}
    </p>
  );
}
