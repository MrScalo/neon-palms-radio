import type { Slot, Station } from "@/lib/radio/types";
import { PresetButtons } from "./PresetButtons";

type TunerProps = {
  stations: readonly Station[];
  station: Station;
  onAir: ReadonlyMap<string, Slot> | null;
  /** Listeners per station id; null hides the counts. */
  listeners: Readonly<Record<string, number>> | null;
  /** Spoken once per switch */
  announcement: string;
  onSelect(id: string): void;
};

/** The three station presets under the controls. */
export function Tuner({ stations, station, onAir, listeners, announcement, onSelect }: TunerProps) {
  return (
    <section aria-labelledby="np-tuner-heading" className="np-tuner">
      <h2 id="np-tuner-heading" className="sr-only">
        Stations
      </h2>
      <PresetButtons
        stations={stations}
        station={station}
        onAir={onAir}
        listeners={listeners}
        labelledBy="np-tuner-heading"
        onSelect={onSelect}
      />
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
