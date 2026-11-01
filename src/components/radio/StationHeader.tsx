import { LivePill } from "./LivePill";
import { OnAirLamp } from "./OnAirLamp";
import { STATION } from "./station";

export function StationHeader({ live }: { live: boolean }) {
  return (
    <header className="np-container grid h-(--header-h) grid-cols-[minmax(0,1fr)_auto] content-center items-center gap-x-6 gap-y-2 pt-3 sm:pt-0">
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex-col sm:items-end sm:gap-2 lg:flex-row lg:items-center lg:gap-3">

        <OnAirLamp />
        <LivePill live={live} />
      </div>

      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-1 sm:row-start-1">
        <h1 className="font-script text-[3.25rem] leading-[1.05] font-normal sm:text-[4.25rem] lg:text-[5.25rem]">
          <span className="np-wordmark inline-block pr-2">{STATION.wordmark}</span>
          <span className="sr-only"> {STATION.band}</span>
        </h1>
        <div className="mt-0.5 flex items-center gap-3 sm:mt-1">
          <p className="np-lcd inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 pt-px font-lcd text-[1.375rem] leading-none">
            {STATION.frequency}
            <span className="text-[0.95rem] text-hot-pink [text-shadow:none]">{STATION.band}</span>
          </p>
          <p className="truncate text-sm text-cream/90 sm:text-base">{STATION.tagline}</p>
        </div>
      </div>
    </header>
  );
}
