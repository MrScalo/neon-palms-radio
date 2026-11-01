import { COUNTDOWN } from "@/config/countdown";

const SECOND_MS = 1000;
const DAY_S = 86_400;
const DAY_MS = DAY_S * SECOND_MS;

export type CountdownState =
  /** `text` is "17d 04:12:33", or "04:12:33" under a day */
  | { kind: "running"; text: string }
  | { kind: "out-now" }
  | { kind: "hidden" };

/** Midnight, local time, at the start of `day`: the visitor's own calendar decides. Client-only. */
export function countdownTarget(day: { year: number; month: number; day: number } = COUNTDOWN.target): number {
  return new Date(day.year, day.month - 1, day.day).getTime();
}

// Rounded up, so the display reads 00:00:01 in the last second and the target itself is "out now".
function secondsLeft(msLeft: number): number {
  return Math.ceil(msLeft / SECOND_MS);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** What the chip shows `msLeft` ms before the target (negative: after it). */
export function formatCountdown(msLeft: number): CountdownState {
  if (Number.isNaN(msLeft) || msLeft === Number.POSITIVE_INFINITY) return { kind: "hidden" };
  if (msLeft <= 0) return msLeft > -COUNTDOWN.outNowDays * DAY_MS ? { kind: "out-now" } : { kind: "hidden" };

  const total = secondsLeft(msLeft);
  const days = Math.floor(total / DAY_S);
  const clock = `${pad(Math.floor((total % DAY_S) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  return { kind: "running", text: days > 0 ? `${days}d ${clock}` : clock };
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** The time left in words, to the minute: "17 days, 4 hours, 12 minutes". For screen readers. */
export function describeCountdown(msLeft: number): string {
  const total = Number.isFinite(msLeft) ? Math.max(0, secondsLeft(msLeft)) : 0;
  const parts: string[] = [];
  const days = Math.floor(total / DAY_S);
  const hours = Math.floor((total % DAY_S) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) parts.push(plural(days, "day"));
  if (hours > 0) parts.push(plural(hours, "hour"));
  if (minutes > 0) parts.push(plural(minutes, "minute"));
  return parts.length > 0 ? parts.join(", ") : "less than a minute";
}
