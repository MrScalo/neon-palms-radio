import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { DEFAULT_STATION_ID, getStation, STATIONS } from "@/config/stations";
import { useYouTubeConsent } from "@/lib/consent";
import { getServerSchedule, useScheduleOutdated, useStationNow } from "@/lib/radio/clock";
import { clampVolume, DEFAULT_VOLUME, RadioEngine } from "@/lib/radio/engine";
import { getOnAir, getUpcoming, liveOffsetSeconds } from "@/lib/radio/schedule";
import type { RadioStatus, Slot, Station } from "@/lib/radio/types";

export type Radio = {
  status: RadioStatus;
  /** All stations of the network, in preset order. */
  stations: readonly Station[];
  /** The selected station. */
  station: Station;
  /**
   * Selects a station; unknown ids are ignored. Call from a click or key handler: while tuned
   * in, the station's live position starts right away, inside the listener's gesture.
   */
  setStation(id: string): void;
  /** Slot on air on the selected station; null only before the first client tick */
  current: Slot | null;
  /** next 3 slots of the selected station */
  upcoming: Slot[];
  /**
   * Slot on air on every station, by station id; null only before the first client tick.
   * Keeps its identity until a station's song changes.
   */
  onAir: ReadonlyMap<string, Slot> | null;
  /** whole seconds into the current track (from the station clock, valid even when off) */
  elapsed: number;
  /** 0..100 */
  volume: number;
  muted: boolean;
  /**
   * A station's programme changed after this page loaded, so this page no longer matches
   * other listeners. It reloads by itself once tuned out; never while tuned in.
   */
  stationUpdated: boolean;
  /** Attach to an EMPTY, always-mounted div; the player iframe is created inside it. */
  playerHostRef: RefObject<HTMLDivElement | null>;
  /** Call from a click handler, only with consent granted (no-op otherwise). */
  tuneIn(): void;
  tuneOut(): void;
  /** For "needs-gesture" or "paused": call from a click; plays and jumps back to live. */
  resume(): void;
  setVolume(volume: number): void;
  toggleMute(): void;
};

const UPCOMING_COUNT = 3;
const RELOADED_FOR_KEY = "neonpalms.reloadedFor";

/** Reloads into the new programme, at most once per server schedule so stale cached HTML can't cause a reload loop. */
function reloadForNewSchedule(): void {
  const schedule = getServerSchedule();
  if (schedule === null) return;
  try {
    if (window.sessionStorage.getItem(RELOADED_FOR_KEY) === schedule) return;
    window.sessionStorage.setItem(RELOADED_FOR_KEY, schedule);
  } catch {
    // Without the guard a reload could loop.
    return;
  }
  window.location.reload();
}

/**
 * The network: shared schedules, the selected station, live position and the YouTube player. Use
 * exactly once. `initialStationId` is the station the page was rendered for.
 */
export function useRadio(initialStationId: string = DEFAULT_STATION_ID): Radio {
  const { consent } = useYouTubeConsent();
  const now = useStationNow(1000);
  const stationUpdated = useScheduleOutdated();
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<RadioStatus>("off");
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [muted, setMutedState] = useState(false);
  const [station, setStationState] = useState(() => getStation(initialStationId));
  const [engine] = useState(() => new RadioEngine(setStatus, { station }));

  // Consent withdrawn (here, in the footer or in another tab): YouTube has to go immediately.
  useEffect(() => {
    if (consent !== "granted") engine.tuneOut();
  }, [consent, engine]);

  useEffect(() => () => engine.tuneOut(), [engine]);

  // Only while off: a reload would cost a listener the permission to play sound.
  useEffect(() => {
    if (stationUpdated && status === "off") reloadForNewSchedule();
  }, [stationUpdated, status]);

  const onAir = useMemo(() => (now === null ? null : getOnAir(now, STATIONS)), [now]);
  const current = onAir?.get(station.id) ?? null;
  const upcoming = useMemo(
    () => (current ? getUpcoming(current.startsAt, UPCOMING_COUNT, station) : []),
    [current, station],
  );
  const elapsed = current !== null && now !== null ? Math.floor(liveOffsetSeconds(current, now)) : 0;

  const setStation = useCallback(
    (id: string) => {
      const next = getStation(id);
      if (next.id !== id) return;
      // Synchronously, so the switch happens inside the listener's click.
      engine.setStation(next);
      setStationState(next);
    },
    [engine],
  );

  const tuneIn = useCallback(() => engine.tuneIn(playerHostRef.current), [engine]);
  const tuneOut = useCallback(() => engine.tuneOut(), [engine]);
  const resume = useCallback(() => engine.resume(), [engine]);

  const setVolume = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return;
      const next = clampVolume(value);
      engine.setVolume(next);
      setVolumeState(next);
      if (next > 0) setMutedState(false);
    },
    [engine],
  );

  const toggleMute = useCallback(() => setMutedState(engine.toggleMute()), [engine]);

  return useMemo(
    () => ({
      status,
      stations: STATIONS,
      station,
      setStation,
      current,
      upcoming,
      onAir,
      elapsed,
      volume,
      muted,
      stationUpdated,
      playerHostRef,
      tuneIn,
      tuneOut,
      resume,
      setVolume,
      toggleMute,
    }),
    [
      status,
      station,
      setStation,
      current,
      upcoming,
      onAir,
      elapsed,
      volume,
      muted,
      stationUpdated,
      tuneIn,
      tuneOut,
      resume,
      setVolume,
      toggleMute,
    ],
  );
}
