/** Lights up while this visitor is actually listening (status "playing"). */
export function LivePill({ live }: { live: boolean }) {
  return (
    <p
      data-live={live}
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3.5 font-display text-[0.75rem] leading-none tracking-[0.18em] uppercase transition-[color,border-color,background-color,box-shadow] duration-500 ${
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
      {live ? (
        "Tuned in · Live"
      ) : (
        <>
          <span className="sr-only">Not tuned in. </span>Live
        </>
      )}
    </p>
  );
}
