import type { Slot } from "@/lib/radio/types";

/** Whole seconds as m:ss (or h:mm:ss from one hour up). */
export function formatClock(totalSeconds: number): string {
  const seconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Seconds until `slot` starts, measured from `elapsed` seconds into `current`. */
export function secondsUntil(slot: Slot, current: Slot, elapsed: number): number {
  return Math.max(0, Math.round((slot.startsAt - current.startsAt) / 1000 - elapsed));
}

/** Identifies one airing; unique across stations, so a switch never reuses another station's row. */
export function slotKey(slot: Slot): string {
  return `${slot.stationId}:${slot.cycle}:${slot.index}`;
}

const COUNT_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** A listener count: "7", "1,234". */
export function formatCount(count: number): string {
  return COUNT_FORMAT.format(Number.isFinite(count) ? Math.max(0, count) : 0);
}
