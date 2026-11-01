import { useId, useRef, type CSSProperties, type KeyboardEvent } from "react";
import type { Slot, Station } from "@/lib/radio/types";
import { formatCount } from "./format";
import { HeadphonesIcon } from "./icons";
import { presetIndexForKey } from "./presetKeys";

type PresetButtonsProps = {
  stations: readonly Station[];
  station: Station;
  /** Current slot of every station; null before the first clock tick. */
  onAir: ReadonlyMap<string, Slot> | null;
  /** Listeners per station id; null hides the counts. */
  listeners: Readonly<Record<string, number>> | null;
  /** Id of the element that names the group */
  labelledBy: string;
  onSelect(id: string): void;
};

/**
 * Car-radio preset keys as one radio group: Tab lands on the selected station, arrow keys move
 * and switch at once, digits jump straight to a preset.
 */
export function PresetButtons({ stations, station, onAir, listeners, labelledBy, onSelect }: PresetButtonsProps) {
  const baseId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const focused = buttons.current.findIndex((button) => button !== null && button === event.target);
    const from = focused >= 0 ? focused : stations.findIndex((item) => item.id === station.id);
    const next = presetIndexForKey(event.key, from, stations.length);
    if (next === null) return;
    event.preventDefault();
    // A held key switches once per press, not ~30 times a second (each switch reloads the video).
    if (event.repeat) return;
    onSelect(stations[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} onKeyDown={handleKeyDown} className="np-presets">
      {stations.map((item, index) => {
        const checked = item.id === station.id;
        const slot = onAir?.get(item.id) ?? null;
        const count = listeners === null ? null : formatCount(listeners[item.id] ?? 0);
        const id = `${baseId}-${item.id}`;

        return (
          <button
            key={item.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            aria-labelledby={`${id}-name ${id}-freq`}
            aria-describedby={`${id}-tagline ${id}-now${count === null ? "" : ` ${id}-listeners`}`}
            onClick={() => onSelect(item.id)}
            data-checked={checked}
            data-listeners={count !== null}
            className="np-preset"
            style={{ "--preset-accent": item.accent } as CSSProperties}
          >
            <span aria-hidden="true" className="np-preset-key">
              {index + 1}
            </span>
            {/* The listener count takes the LED's place and lights up like it. */}
            {count === null && <span aria-hidden="true" className="np-preset-led" />}
            <span id={`${id}-name`} className="np-preset-name">
              {item.name}
            </span>
            <span id={`${id}-freq`} className="np-preset-freq">
              {item.frequency}
              <span className="sr-only"> FM</span>
            </span>
            {count !== null && (
              <span id={`${id}-listeners`} role="img" aria-label={`${count} tuned in`} className="np-preset-listeners">
                <HeadphonesIcon />
                {count}
              </span>
            )}
            <span id={`${id}-tagline`} className="np-preset-tagline">
              {item.tagline}
            </span>
            <span id={`${id}-now`} className="np-preset-now">
              <span aria-hidden="true" className="np-preset-now-label">
                Now
              </span>
              {slot ? (
                <span className="min-w-0 truncate">
                  <span className="sr-only">Now playing: </span>
                  {slot.track.artist} – {slot.track.title}
                </span>
              ) : (
                <span aria-hidden="true" className="block h-3 w-2/3 rounded bg-plum/70 motion-safe:animate-pulse" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
