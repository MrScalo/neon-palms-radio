"use client";

import { useState } from "react";
import { PauseIcon, PlayIcon } from "./icons";
import { BULLETINS } from "./station";

function BulletinList({ copy = false }: { copy?: boolean }) {
  return (
    <ul
      aria-hidden={copy || undefined}
      className={`shrink-0 items-center gap-10 pr-10 ${copy ? "np-marquee-copy" : "flex"}`}
    >
      {BULLETINS.map((line) => (
        <li key={line} className="flex items-center gap-10 whitespace-nowrap">
          <span aria-hidden="true" className="size-1.5 rotate-45 bg-hot-pink shadow-[0_0_8px_var(--color-hot-pink)]" />
          {line}
        </li>
      ))}
    </ul>
  );
}

/** Slow bulletin crawl. Pauses while the text is hovered and with its own button; still under reduced motion. */
export function StationTicker() {
  const [paused, setPaused] = useState(false);

  return (
    <aside
      aria-label="Station bulletins"
      data-paused={paused}
      className="np-ticker border-y border-plum/80 bg-dusk/80 shadow-[inset_0_1px_0_rgb(255_47_160/0.15)]"
    >
      <div className="np-container flex h-14 items-center gap-4">
        <p className="hidden shrink-0 font-display text-[0.6875rem] tracking-[0.22em] text-sunset-yellow uppercase sm:block">
          Coast report
        </p>
        <div className="np-marquee min-w-0 flex-1 py-2">
          <div className="np-marquee-track flex w-max text-sm text-cream/90">
            <BulletinList />
            <BulletinList copy />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
          aria-label="Pause bulletins"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-plum text-muted transition-colors hover:border-muted hover:text-cream motion-reduce:hidden"
        >
          {paused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
        </button>
      </div>
    </aside>
  );
}
