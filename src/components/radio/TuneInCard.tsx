import { PowerIcon } from "./icons";

/** Shown in the screen once YouTube is allowed but this visitor isn't listening yet. */
export function TuneInCard({ onTuneIn }: { onTuneIn(): void }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
      <button
        type="button"
        onClick={onTuneIn}
        className="group flex flex-col items-center gap-4 rounded-3xl p-2 text-cream"
      >
        <span aria-hidden="true" className="np-orb grid size-20 place-items-center rounded-full sm:size-24">
          <PowerIcon className="size-9 sm:size-10" />
        </span>
        <span className="font-display text-lg tracking-[0.22em] uppercase transition-colors group-hover:text-hot-pink">
          Tune in
        </span>
      </button>
      <p className="max-w-xs text-sm leading-relaxed text-muted">
        You join at the live position, in sync with everyone listening.
      </p>
    </div>
  );
}
