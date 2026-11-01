import { useId, type CSSProperties } from "react";
import { SpeakerIcon, SpeakerMutedIcon } from "./icons";

type VolumeControlProps = {
  volume: number;
  muted: boolean;
  disabled: boolean;
  onVolume(volume: number): void;
  onToggleMute(): void;
  className?: string;
};

export function VolumeControl({ volume, muted, disabled, onVolume, onToggleMute, className }: VolumeControlProps) {
  const id = useId();
  const silent = muted || volume === 0;

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <button
        type="button"
        onClick={onToggleMute}
        disabled={disabled}
        aria-pressed={muted}
        aria-label="Mute"
        className="grid size-11 shrink-0 place-items-center rounded-full text-cream transition-colors hover:text-neon-cyan disabled:cursor-not-allowed disabled:opacity-45 aria-pressed:text-hot-pink"
      >
        {silent ? <SpeakerMutedIcon className="size-5" /> : <SpeakerIcon className="size-5" />}
      </button>
      <label htmlFor={id} className="sr-only">
        Volume
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={volume}
        disabled={disabled}
        onChange={(event) => onVolume(Number(event.currentTarget.value))}
        aria-valuetext={muted ? `${volume} percent, muted` : `${volume} percent`}
        data-muted={muted}
        className="np-range w-full min-w-0 sm:w-36"
        style={{ "--np-level": `${volume}%` } as CSSProperties}
      />
    </div>
  );
}
