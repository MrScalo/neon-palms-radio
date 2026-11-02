import type { ReactNode } from "react";
import { COUNTDOWN } from "@/config/countdown";
import type { Station } from "@/lib/radio/types";
import { CountdownChip } from "./CountdownChip";
import { LivePill } from "./LivePill";
import { OnAirLamp } from "./OnAirLamp";
import { NETWORK } from "./station";

type StationHeaderProps = {
  live: boolean;
  station: Station;
  /** Everyone tuned in across the network; null hides the count. */
  listeners: number | null;
  /** Switches to the countdown's station, like pressing its preset */
  onCountdownTune(): void;
  /** Drawn under the live pill */
  hud?: ReactNode;
};

export function StationHeader({ live, station, listeners, onCountdownTune, hud }: StationHeaderProps) {
  return (
    <header className="np-container grid h-(--header-h) grid-cols-[minmax(0,1fr)_auto] content-center items-center gap-x-6 gap-y-2 pt-3 sm:pt-0">
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex-col sm:items-end sm:gap-2 lg:flex-row lg:items-center lg:gap-3">
        <OnAirLamp />
        <div className="relative">
          <LivePill live={live} listeners={listeners} />
          {hud}
        </div>
      </div>

      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-1 sm:row-start-1">
        <h1 className="flex items-baseline gap-1 font-script text-[3.25rem] leading-[1.05] font-normal sm:text-[4.25rem] lg:text-[5.25rem]">
          <span className="np-wordmark inline-block pr-2">{NETWORK.wordmark}</span>{" "}
          {/* Part of the name everywhere; drawn only where there's room next to the script. */}
          <span className="sr-only font-lcd text-2xl leading-none tracking-[0.2em] text-sunset-yellow uppercase sm:not-sr-only">
            {NETWORK.suffix}
          </span>
        </h1>
        <div className="mt-0.5 flex items-center gap-3 sm:mt-1">
          <p className="np-lcd np-lcd--station inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 pt-px font-lcd text-[1.375rem] leading-none">
            <span className="sr-only">Selected station: </span>
            {station.frequency}{" "}
            <span className="text-[0.95rem] text-cream/70 [text-shadow:none]">{NETWORK.band}</span>{" "}
            <span className="ml-1.5 text-[1.125rem] tracking-[0.12em] uppercase">{station.name}</span>
          </p>
          <p className="truncate text-sm text-cream/90 sm:text-base">{NETWORK.tagline}</p>
        </div>
        {/* Its own row: next to the display it would squeeze out the tagline. The header grows to fit (globals.css). */}
        <CountdownChip tuned={station.id === COUNTDOWN.stationId} onTune={onCountdownTune} className="mt-1.5" />
      </div>
    </header>
  );
}
