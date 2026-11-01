import type { RefObject } from "react";
import type { RadioStatus } from "@/lib/radio/types";
import { PowerButton } from "./PowerButton";
import { StatusLine } from "./StatusLine";
import { VolumeControl } from "./VolumeControl";

type ControlsBarProps = {
  status: RadioStatus;
  volume: number;
  muted: boolean;
  remaining: number;
  stationUpdated: boolean;
  onPower(): void;
  onResume(): void;
  onVolume(volume: number): void;
  onToggleMute(): void;
  powerRef?: RefObject<HTMLButtonElement | null>;
};

/** Listeners can only switch on/off and set the level: no skip, seek or pause, like a real radio. */
export function ControlsBar({
  status,
  volume,
  muted,
  remaining,
  stationUpdated,
  onPower,
  onResume,
  onVolume,
  onToggleMute,
  powerRef,
}: ControlsBarProps) {
  const off = status === "off";

  return (
    // One row only from xl: narrower, the status line's action button needs the full width of its own row.
    <div className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-0.5 [grid-template-areas:'power_volume'_'status_status'] max-[379px]:grid-cols-1 max-[379px]:[grid-template-areas:'power'_'volume'_'status'] sm:mt-4 sm:gap-x-5 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:[grid-template-areas:'power_status_volume']">
      <div className="[grid-area:power]">
        <PowerButton status={status} onPress={onPower} buttonRef={powerRef} />
      </div>
      <VolumeControl
        volume={volume}
        muted={muted}
        disabled={off}
        onVolume={onVolume}
        onToggleMute={onToggleMute}
        className="w-full max-w-[13rem] justify-self-end [grid-area:volume] max-[379px]:max-w-none max-[379px]:justify-self-stretch sm:w-auto"
      />
      <StatusLine
        status={status}
        remaining={remaining}
        stationUpdated={stationUpdated}
        onResume={onResume}
        className="[grid-area:status]"
      />
    </div>
  );
}
