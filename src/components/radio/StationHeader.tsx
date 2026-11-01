import type { Station } from "@/lib/radio/types";
import { LivePill } from "./LivePill";
import { OnAirLamp } from "./OnAirLamp";
import { NETWORK } from "./station";

export function StationHeader({ live, station }: { live: boolean; station: Station }) {
  return (
    <header className="np-container grid h-(--header-h) grid-cols-[minmax(0,1fr)_auto] content-center items-center gap-x-6 gap-y-2 pt-3 sm:pt-0">
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex-col sm:items-end sm:gap-2 lg:flex-row lg:items-center lg:gap-3">
        <OnAirLamp />
        <LivePill live={live} />
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
      </div>
    </header>
  );
}
