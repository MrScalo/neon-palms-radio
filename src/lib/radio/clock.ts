import { useCallback, useSyncExternalStore } from "react";
import { SCHEDULE_FINGERPRINT } from "./schedule";

/**
 * The shared station clock: the local clock corrected by the offset to our server's clock,
 * so every visitor agrees on "now" (and therefore on the song and position) even when their
 * own clock is off. Client-only; starts lazily on first use.
 */

export type ClockSample = {
  /** Local Date.now() right before the request */
  t0: number;
  /** Local Date.now() after the response was read */
  t1: number;
  /** Server Date.now() from the response */
  serverNow: number;
};

type TimeSample = ClockSample & {
  /** The server's programme fingerprint, when it sent one */
  schedule?: string;
};

const TIME_ENDPOINT = "/api/time";
const SAMPLE_COUNT = 4;
const REQUEST_TIMEOUT_MS = 5_000;
const RESYNC_MS = 10 * 60_000;
const RETRY_MS = 30_000;
const MIN_VISIBLE_RESYNC_GAP_MS = 15_000;
// Lands each tick just after the boundary so floor()-based displays never show the old second.
const TICK_LEAD_MS = 2;

/**
 * Offset (server − local) from the sample with the smallest round trip, assuming the server
 * read its clock halfway through that round trip. Null when no sample is usable.
 */
export function computeClockOffset(samples: readonly ClockSample[]): number | null {
  let best: ClockSample | null = null;
  for (const sample of samples) {
    const { t0, t1, serverNow } = sample;
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || !Number.isFinite(serverNow) || t1 < t0) continue;
    if (best === null || t1 - t0 < best.t1 - best.t0) best = sample;
  }
  return best === null ? null : best.serverNow - (best.t0 + best.t1) / 2;
}

// --- Clock store -------------------------------------------------------------------------

let offsetMs = 0;
let synced = false;
let started = false;
let inFlight: Promise<void> | null = null;
let resyncTimer: ReturnType<typeof setTimeout> | null = null;
let lastAttemptAt = Number.NEGATIVE_INFINITY;
/** Set for good once the server airs a different programme than this page computes. */
let scheduleOutdated = false;
let serverSchedule: string | null = null;
const clockListeners = new Set<() => void>();

function emitClock(): void {
  for (const listener of [...clockListeners]) listener();
}

function subscribeClock(listener: () => void): () => void {
  ensureClockStarted();
  clockListeners.add(listener);
  return () => {
    clockListeners.delete(listener);
  };
}

async function fetchSample(): Promise<TimeSample | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const t0 = Date.now();
    const response = await fetch(TIME_ENDPOINT, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const t1 = Date.now();
    if (typeof body !== "object" || body === null) return null;
    const { now: serverNow, schedule } = body as { now?: unknown; schedule?: unknown };
    if (typeof serverNow !== "number") return null;
    return typeof schedule === "string" ? { t0, t1, serverNow, schedule } : { t0, t1, serverNow };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Remembers a server programme that differs from ours; true when that is news. */
function noteServerSchedule(samples: readonly TimeSample[]): boolean {
  for (const { schedule } of samples) {
    if (schedule === undefined || schedule === SCHEDULE_FINGERPRINT || schedule === serverSchedule) continue;
    scheduleOutdated = true;
    serverSchedule = schedule;
    return true;
  }
  return false;
}

function scheduleResync(delayMs: number): void {
  if (resyncTimer !== null) clearTimeout(resyncTimer);
  resyncTimer = setTimeout(() => {
    resyncTimer = null;
    void syncClock();
  }, delayMs);
}

function syncClock(): Promise<void> {
  if (inFlight) return inFlight;
  lastAttemptAt = Date.now();
  inFlight = (async () => {
    const samples: TimeSample[] = [];
    // Sequential on purpose: parallel requests would queue behind each other and inflate round trips.
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const sample = await fetchSample();
      if (sample) samples.push(sample);
    }
    const outdatedNews = noteServerSchedule(samples);
    const offset = computeClockOffset(samples);
    if (offset === null) {
      scheduleResync(RETRY_MS);
      if (outdatedNews) emitClock();
      return;
    }
    const changed = !synced || Math.abs(offset - offsetMs) >= 1;
    offsetMs = offset;
    synced = true;
    scheduleResync(RESYNC_MS);
    if (changed || outdatedNews) emitClock();
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function handleVisibilityChange(): void {
  if (document.visibilityState !== "visible") return;
  // Hidden tabs throttle timers heavily; let every ticker catch up right away.
  emitClock();
  if (Date.now() - lastAttemptAt >= MIN_VISIBLE_RESYNC_GAP_MS) void syncClock();
}

function ensureClockStarted(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  document.addEventListener("visibilitychange", handleVisibilityChange);
  void syncClock();
}

/** Current station time in ms (local clock + measured server offset). */
export function stationNow(): number {
  ensureClockStarted();
  return Date.now() + offsetMs;
}

// --- Aligned tickers ---------------------------------------------------------------------

type Ticker = {
  intervalMs: number;
  value: number | null;
  timer: ReturnType<typeof setTimeout> | null;
  listeners: Set<() => void>;
  unsubscribeClock: () => void;
};

const tickers = new Map<number, Ticker>();

function delayToNextBoundary(now: number, intervalMs: number): number {
  const intoInterval = ((now % intervalMs) + intervalMs) % intervalMs;
  return intervalMs - intoInterval + TICK_LEAD_MS;
}

function tick(ticker: Ticker): void {
  if (ticker.timer !== null) clearTimeout(ticker.timer);
  const now = stationNow();
  ticker.value = now;
  ticker.timer = setTimeout(() => {
    ticker.timer = null;
    tick(ticker);
    for (const listener of [...ticker.listeners]) listener();
  }, delayToNextBoundary(now, ticker.intervalMs));
}

function subscribeTicker(intervalMs: number, listener: () => void): () => void {
  let ticker = tickers.get(intervalMs);
  if (!ticker) {
    const created: Ticker = {
      intervalMs,
      value: null,
      timer: null,
      listeners: new Set(),
      unsubscribeClock: () => {},
    };
    // Re-align (and re-render) whenever the offset changes or the tab becomes visible.
    created.unsubscribeClock = subscribeClock(() => {
      tick(created);
      for (const l of [...created.listeners]) l();
    });
    // Set the value without notifying: React re-reads the snapshot right after subscribing.
    tick(created);
    tickers.set(intervalMs, created);
    ticker = created;
  }
  ticker.listeners.add(listener);

  const owner = ticker;
  return () => {
    owner.listeners.delete(listener);
    if (owner.listeners.size > 0) return;
    if (owner.timer !== null) clearTimeout(owner.timer);
    owner.unsubscribeClock();
    if (tickers.get(owner.intervalMs) === owner) tickers.delete(owner.intervalMs);
  };
}

const getNullSnapshot = (): null => null;
const getFalse = (): boolean => false;
const getSynced = (): boolean => synced;

/**
 * Station time, re-rendering on every `intervalMs` boundary of the station clock so all
 * visitors' displays flip together. Null on the server and during hydration.
 */
export function useStationNow(intervalMs: number = 1000): number | null {
  const interval = Number.isFinite(intervalMs) && intervalMs >= 16 ? Math.round(intervalMs) : 1000;
  const subscribe = useCallback((listener: () => void) => subscribeTicker(interval, listener), [interval]);
  const getSnapshot = useCallback(() => tickers.get(interval)?.value ?? null, [interval]);
  return useSyncExternalStore(subscribe, getSnapshot, getNullSnapshot);
}

/** True once the clock has been synced with the server at least once. */
export function useClockSynced(): boolean {
  return useSyncExternalStore(subscribeClock, getSynced, getFalse);
}

// --- Programme version -------------------------------------------------------------------

/** True once /api/time reported a different programme than the one this page computes. Never resets. */
export function isScheduleOutdated(): boolean {
  return scheduleOutdated;
}

/** The server's programme fingerprint once it differs from ours, else null. */
export function getServerSchedule(): string | null {
  return serverSchedule;
}

/** isScheduleOutdated() as React state; false on the server. */
export function useScheduleOutdated(): boolean {
  return useSyncExternalStore(subscribeClock, isScheduleOutdated, getFalse);
}
