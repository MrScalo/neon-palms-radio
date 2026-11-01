import { getStation } from "@/config/stations";
import { getYouTubeConsent, type ConsentState } from "@/lib/consent";
import { stationNow } from "./clock";
import { getSlotAt, liveOffsetSeconds } from "./schedule";
import type { RadioStatus, Slot, Station } from "./types";
import { loadYouTubeIframeApi, YT_NOCOOKIE_HOST, YTState, type YTNamespace, type YTPlayer } from "./youtube";

export const DEFAULT_VOLUME = 80;
const SYNC_INTERVAL_MS = 1_000;
/** Fires the sync this long after a slot boundary so the new slot is already current. */
const SLOT_EDGE_DELAY_MS = 30;
const DRIFT_TOLERANCE_S = 2.5;
const CORRECTION_COOLDOWN_MS = 8_000;
/** Seeks land a little ahead because the seek itself takes time. */
const SEEK_LEAD_S = 0.4;
const GESTURE_CHECK_MS = 3_000;
const MAX_BUFFERING_CHECKS = 3;
const READY_TIMEOUT_MS = 20_000;
/** PAUSED events this soon after our own seek/load are side effects, not the listener. */
const OWN_ACTION_GRACE_MS = 1_500;
/** Waits before each retry of a slot after a failure that may be temporary; after the last one the slot is given up. */
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000] as const;
/** Player errors no retry can fix: invalid parameter, video removed or private, embedding not allowed. */
const UNPLAYABLE_ERRORS: ReadonlySet<number> = new Set([2, 100, 101, 150]);
/** YouTube allows starting playback automatically only while the tab is visible and more than half of the player is on screen. */
const MIN_VISIBLE_RATIO = 0.5;

type Timer = ReturnType<typeof setTimeout>;

export type RadioEngineDeps = {
  /** Station clock in ms */
  now?: () => number;
  loadApi?: () => Promise<YTNamespace>;
  getConsent?: () => ConsentState;
  /** Station selected at start; the default station when omitted. */
  station?: Station;
};

/** Includes the station, so switching stations always loads even when cycle and index happen to match. */
function slotKey(slot: Slot): string {
  return `${slot.stationId}:${slot.cycle}:${slot.index}`;
}

function clearTimer(timer: Timer | null): null {
  if (timer !== null) clearTimeout(timer);
  return null;
}

export function clampVolume(volume: number): number {
  return Math.min(100, Math.max(0, Math.round(volume)));
}

/**
 * Imperative side of the radio: owns the YouTube player and keeps it on the live position of
 * the shared schedule. Lives outside React so the iframe is never part of the React tree.
 */
export class RadioEngine {
  private status: RadioStatus = "off";
  private active = false;
  /** Bumped whenever a player is torn down so callbacks from an old player are ignored. */
  private generation = 0;
  private host: HTMLDivElement | null = null;
  private player: YTPlayer | null = null;
  private ready = false;
  private loading = false;
  private loadedKey: string | null = null;
  private failedKey: string | null = null;
  /** performance.now() when the failed slot may be tried again; null when it waits for the next slot. */
  private retryAt: number | null = null;
  /** The slot whose failures retryAttempts counts. */
  private retryKey: string | null = null;
  private retryAttempts = 0;
  /** We paused or only cued because the listener couldn't see the player; playback resumes once they can. */
  private heldForVisibility = false;
  /** Set by tuneIn(): the first start answers the listener's click, it is not an automatic playback. */
  private startRequested = false;
  private visibleRatio = 1;
  private observer: IntersectionObserver | null = null;
  private hasPlayed = false;
  private lastCorrectionAt = Number.NEGATIVE_INFINITY;
  private ownActionAt = Number.NEGATIVE_INFINITY;
  private syncTimer: Timer | null = null;
  private gestureTimer: Timer | null = null;
  private readyTimer: Timer | null = null;
  private volume = DEFAULT_VOLUME;
  private muted = false;
  private station: Station;
  private readonly now: () => number;
  private readonly loadApi: () => Promise<YTNamespace>;
  private readonly getConsent: () => ConsentState;

  constructor(
    private readonly onStatus: (status: RadioStatus) => void,
    {
      now = stationNow,
      loadApi = loadYouTubeIframeApi,
      getConsent = getYouTubeConsent,
      station = getStation(null),
    }: RadioEngineDeps = {},
  ) {
    this.now = now;
    this.loadApi = loadApi;
    this.getConsent = getConsent;
    this.station = station;
  }

  tuneIn(host: HTMLDivElement | null): void {
    if (this.active || this.getConsent() !== "granted") return;
    if (!host) {
      if (process.env.NODE_ENV !== "production") console.warn("useRadio: playerHostRef is not attached to a div.");
      return;
    }
    this.active = true;
    this.host = host;
    this.startRequested = true;
    this.setStatus("connecting");
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.observeHost(host);
    this.startPlayer();
    this.sync();
  }

  tuneOut(): void {
    if (!this.active) return;
    this.active = false;
    this.generation += 1;
    this.syncTimer = clearTimer(this.syncTimer);
    this.gestureTimer = clearTimer(this.gestureTimer);
    this.readyTimer = clearTimer(this.readyTimer);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.observer?.disconnect();
    this.observer = null;
    this.visibleRatio = 1;
    this.destroyPlayer();
    this.host = null;
    this.loading = false;
    this.loadedKey = null;
    this.failedKey = null;
    this.retryAt = null;
    this.retryKey = null;
    this.retryAttempts = 0;
    this.heldForVisibility = false;
    this.startRequested = false;
    this.hasPlayed = false;
    this.lastCorrectionAt = Number.NEGATIVE_INFINITY;
    this.setStatus("off");
  }

  /**
   * Switches to `station`. While tuned in, call it from a click or key handler: its live slot
   * starts right away, inside the listener's gesture. While off, it only changes the selection.
   */
  setStation(station: Station): void {
    if (station.id === this.station.id && station.tracks === this.station.tracks) return;
    this.station = station;
    if (!this.active) return;

    // Failures and corrections counted on the old station say nothing about the new one.
    this.failedKey = null;
    this.retryAt = null;
    this.retryKey = null;
    this.retryAttempts = 0;
    this.lastCorrectionAt = Number.NEGATIVE_INFINITY;
    this.heldForVisibility = false;
    this.gestureTimer = clearTimer(this.gestureTimer);

    if (!this.player || !this.ready) {
      // A player that is still to be created or coming up starts on the selected station.
      this.setStatus(this.hasPlayed ? "buffering" : "connecting");
      this.sync();
      return;
    }
    const now = this.now();
    const slot = getSlotAt(now, station);
    // Even a click must not start playback in a hidden tab (keyboard shortcut, media key).
    if (document.visibilityState === "visible") {
      this.setStatus(this.hasPlayed ? "buffering" : "connecting");
      this.loadSlot(slot, now);
    } else {
      this.cueSlot(slot, now);
    }
    // Not a full sync: right after loadVideoById the player may still report the old video as playing.
    this.scheduleSync(slot, now);
  }

  resume(): void {
    if (!this.active || !this.player || !this.ready) return;
    if (this.status !== "paused" && this.status !== "needs-gesture") return;
    // Everything must happen synchronously inside the click so the browser (and YouTube) count it as the listener's.
    this.resumeLive();
  }

  setVolume(volume: number): void {
    this.volume = volume;
    this.command((p) => p.setVolume(volume));
    if (volume > 0 && this.muted) this.setMuted(false);
  }

  /** Returns the new muted state. */
  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- Player lifecycle --------------------------------------------------------------------

  private startPlayer(): void {
    const generation = this.generation;
    this.loading = true;
    this.setStatus("connecting");
    this.loadApi().then(
      (api) => {
        if (generation !== this.generation) return;
        this.loading = false;
        this.createPlayer(api);
      },
      () => {
        if (generation !== this.generation) return;
        this.loading = false;
        this.retrySlot(slotKey(getSlotAt(this.now(), this.station)));
      },
    );
  }

  private createPlayer(api: YTNamespace): void {
    const host = this.host;
    if (!host) return;
    host.replaceChildren();
    // YouTube replaces this element with its iframe; React never sees either.
    const mount = document.createElement("div");
    host.appendChild(mount);

    const now = this.now();
    const slot = getSlotAt(now, this.station);
    const key = slotKey(slot);
    this.loadedKey = key;
    this.ready = false;

    const generation = this.generation;
    const current = <A extends unknown[]>(handler: (...args: A) => void) =>
      (...args: A) => {
        if (generation === this.generation) handler(...args);
      };

    try {
      this.player = new api.Player(mount, {
        host: YT_NOCOOKIE_HOST,
        width: "100%",
        height: "100%",
        videoId: slot.track.id,
        playerVars: {
          autoplay: this.mayStartNow() ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
          rel: 0,
          start: Math.floor(liveOffsetSeconds(slot, now)),
          origin: window.location.origin,
        },
        events: {
          onReady: current(() => this.handleReady()),
          onStateChange: current((event) => this.handleStateChange(event.data)),
          onError: current((event) => this.handleError(event.data)),
          onAutoplayBlocked: current(() => this.handleAutoplayBlocked()),
        },
      });
    } catch {
      this.destroyPlayer();
      this.retrySlot(key);
      return;
    }

    this.readyTimer = clearTimer(this.readyTimer);
    this.readyTimer = setTimeout(
      current(() => {
        this.readyTimer = null;
        if (this.ready) return;
        // The player never came up (blocked or offline): drop it and try again shortly.
        this.destroyPlayer();
        this.retrySlot(key);
      }),
      READY_TIMEOUT_MS,
    );
  }

  private destroyPlayer(): void {
    const player = this.player;
    // Late events or timers from this player must not touch its successor.
    this.generation += 1;
    this.player = null;
    this.ready = false;
    this.readyTimer = clearTimer(this.readyTimer);
    try {
      player?.destroy();
    } catch {
      // Already gone together with its iframe.
    }
    this.host?.replaceChildren();
  }

  // --- Player events -----------------------------------------------------------------------

  private handleReady(): void {
    this.ready = true;
    this.readyTimer = clearTimer(this.readyTimer);
    this.applyVolume();
    const mayStart = this.mayStartNow();
    // Only the first player answers the click; a retried one follows the rules for automatic playback.
    this.startRequested = false;
    if (mayStart) {
      this.resumeLive();
    } else {
      const now = this.now();
      this.cueSlot(getSlotAt(now, this.station), now);
    }
  }

  private handleStateChange(state: number): void {
    switch (state) {
      case YTState.PLAYING:
        // Sent before our own pause landed; the PAUSED that follows settles it.
        if (this.heldForVisibility && this.withinOwnActionGrace()) break;
        if (this.status === "paused" || this.status === "needs-gesture") {
          // Restarted from the video itself: jump back to live on the sync below.
          this.lastCorrectionAt = Number.NEGATIVE_INFINITY;
        }
        this.markPlaying();
        break;
      case YTState.BUFFERING:
        if (this.hasPlayed && this.status === "playing") this.setStatus("buffering");
        break;
      case YTState.PAUSED:
        if (this.status !== "signal-lost" && this.retryAt === null && !this.withinOwnActionGrace()) {
          this.interrupt(this.hasPlayed ? "paused" : "needs-gesture");
        }
        break;
      default:
        // ENDED before the slot is over (video slightly shorter than scheduled): wait for the next slot.
        break;
    }
    this.sync();
  }

  private handleError(code: number): void {
    if (UNPLAYABLE_ERRORS.has(code)) this.loseSignal(this.loadedKey);
    else this.retrySlot(this.loadedKey);
  }

  private handleAutoplayBlocked(): void {
    if (this.status !== "playing") this.interrupt("needs-gesture");
  }

  /** A failure that may be temporary (network, player hiccup): try the same slot again at the live position a few times. */
  private retrySlot(key: string | null): void {
    if (key !== this.retryKey) {
      this.retryKey = key;
      this.retryAttempts = 0;
    }
    if (this.retryAttempts >= RETRY_DELAYS_MS.length) {
      this.loseSignal(key);
      return;
    }
    this.failedKey = key;
    this.retryAt = performance.now() + RETRY_DELAYS_MS[this.retryAttempts];
    this.retryAttempts += 1;
    this.heldForVisibility = false;
    this.gestureTimer = clearTimer(this.gestureTimer);
    this.setStatus(this.hasPlayed ? "buffering" : "connecting");
  }

  private loseSignal(key: string | null): void {
    this.failedKey = key;
    this.retryAt = null;
    this.heldForVisibility = false;
    this.gestureTimer = clearTimer(this.gestureTimer);
    this.setStatus("signal-lost");
  }

  private interrupt(status: "paused" | "needs-gesture"): void {
    this.gestureTimer = clearTimer(this.gestureTimer);
    this.setStatus(status);
  }

  private markPlaying(): void {
    this.hasPlayed = true;
    this.heldForVisibility = false;
    if (this.retryAt !== null) {
      // Recovered by itself while a retry was pending.
      this.failedKey = null;
      this.retryAt = null;
    }
    this.retryKey = null;
    this.retryAttempts = 0;
    this.gestureTimer = clearTimer(this.gestureTimer);
    this.setStatus("playing");
  }

  private readonly handleVisibility = (): void => {
    if (!this.active) return;
    if (document.visibilityState !== "visible") {
      // YouTube forbids playing in a player the listener can't see.
      if (this.ready && (this.status === "connecting" || this.status === "buffering" || this.status === "playing")) {
        this.holdForVisibility();
      }
      return;
    }
    this.lastCorrectionAt = Number.NEGATIVE_INFINITY;
    if (this.heldForVisibility && this.ready && this.mayAutoplay()) this.resumeLive();
    this.sync();
  };

  private readonly handleIntersection = (entries: IntersectionObserverEntry[]): void => {
    const entry = entries[entries.length - 1];
    if (!entry) return;
    this.visibleRatio = entry.intersectionRatio;
    if (this.active && this.heldForVisibility && this.ready && this.mayAutoplay()) this.resumeLive();
  };

  private observeHost(host: HTMLDivElement): void {
    // Until the first report (or without IntersectionObserver) the player counts as visible.
    this.visibleRatio = 1;
    if (typeof IntersectionObserver === "undefined") return;
    this.observer = new IntersectionObserver(this.handleIntersection, { threshold: [0, MIN_VISIBLE_RATIO] });
    this.observer.observe(host);
  }

  // --- Keeping on air ----------------------------------------------------------------------

  /** Next sync in a second at the latest, and just after `slot` ends. */
  private scheduleSync(slot: Slot, now: number): void {
    this.syncTimer = clearTimer(this.syncTimer);
    const untilNextSlot = slot.endsAt - now + SLOT_EDGE_DELAY_MS;
    this.syncTimer = setTimeout(this.sync, Math.max(50, Math.min(SYNC_INTERVAL_MS, untilNextSlot)));
  }

  /** Runs every second (and on every player event): follows slot changes and corrects drift. */
  private readonly sync = (): void => {
    this.syncTimer = clearTimer(this.syncTimer);
    if (!this.active) return;

    const now = this.now();
    const slot = getSlotAt(now, this.station);
    const key = slotKey(slot);
    this.scheduleSync(slot, now);

    if (key === this.failedKey) {
      // Signal lost on this slot: wait for the next one, or for the pending retry.
      if (this.retryAt === null || performance.now() < this.retryAt) return;
      // Still coming up: its ready timeout decides.
      if (this.player && !this.ready) return;
      this.failedKey = null;
      this.retryAt = null;
      if (!this.player) {
        if (!this.loading) this.startPlayer();
        return;
      }
      this.startSlot(slot, now);
      return;
    }
    if (!this.player) {
      if (!this.loading) this.startPlayer();
      return;
    }
    if (!this.ready) return;

    const state = this.query((p) => p.getPlayerState(), YTState.UNSTARTED);
    if (this.status === "paused" || this.status === "needs-gesture") {
      // Only resume() or the listener pressing play on the video itself restarts playback.
      if (state !== YTState.PLAYING || (this.heldForVisibility && this.withinOwnActionGrace())) return;
      this.lastCorrectionAt = Number.NEGATIVE_INFINITY;
      this.markPlaying();
    }

    if (key !== this.loadedKey) {
      this.startSlot(slot, now);
      return;
    }

    if (state === YTState.PLAYING) {
      if (!this.withinOwnActionGrace() && this.playingOtherVideo(slot)) {
        // The listener picked another video inside the embed: back to the station.
        this.startSlot(slot, now);
        return;
      }
      if (this.status !== "playing") this.markPlaying();
      const drift = this.query((p) => p.getCurrentTime(), 0) - liveOffsetSeconds(slot, now);
      if (Math.abs(drift) > DRIFT_TOLERANCE_S && performance.now() - this.lastCorrectionAt > CORRECTION_COOLDOWN_MS) {
        this.seekToLive(slot, now);
      }
    } else if (state === YTState.PAUSED && this.hasPlayed && !this.withinOwnActionGrace()) {
      this.interrupt("paused");
    }
  };

  /** Plays the live position: loads the slot on air if it changed, otherwise jumps back to live. */
  private resumeLive(): void {
    const now = this.now();
    const slot = getSlotAt(now, this.station);
    this.heldForVisibility = false;
    this.setStatus(this.hasPlayed ? "buffering" : "connecting");
    if (slotKey(slot) !== this.loadedKey) {
      this.loadSlot(slot, now);
      return;
    }
    this.seekToLive(slot, now);
    this.command((p) => p.playVideo());
    this.armGestureCheck();
  }

  /** Follows the schedule to `slot` without a click: plays it if YouTube allows that right now, otherwise only cues it. */
  private startSlot(slot: Slot, now: number): void {
    if (this.mayAutoplay()) this.loadSlot(slot, now);
    else this.cueSlot(slot, now);
  }

  private loadSlot(slot: Slot, now: number): void {
    this.loadedKey = slotKey(slot);
    this.failedKey = null;
    this.retryAt = null;
    this.markOwnAction();
    this.lastCorrectionAt = performance.now();
    this.command((p) => p.loadVideoById({ videoId: slot.track.id, startSeconds: liveOffsetSeconds(slot, now) }));
    if (this.status === "signal-lost") this.setStatus(this.hasPlayed ? "buffering" : "connecting");
    this.armGestureCheck();
  }

  /** Readies `slot` at the live position without playing it, until the listener can see the player. */
  private cueSlot(slot: Slot, now: number): void {
    this.loadedKey = slotKey(slot);
    this.failedKey = null;
    this.retryAt = null;
    this.markOwnAction();
    this.command((p) => p.cueVideoById({ videoId: slot.track.id, startSeconds: liveOffsetSeconds(slot, now) }));
    this.heldForVisibility = true;
    this.interrupt("paused");
  }

  private holdForVisibility(): void {
    this.markOwnAction();
    this.command((p) => p.pauseVideo());
    this.heldForVisibility = true;
    this.interrupt("paused");
  }

  private seekToLive(slot: Slot, now: number): void {
    const duration = (slot.endsAt - slot.startsAt) / 1000;
    const target = Math.min(liveOffsetSeconds(slot, now) + SEEK_LEAD_S, duration);
    this.markOwnAction();
    this.lastCorrectionAt = performance.now();
    this.command((p) => p.seekTo(target, true));
  }

  /** Autoplay blocks (typical on iOS Safari) often stay silent: if nothing plays a few seconds after we asked, ask for a tap. */
  private armGestureCheck(): void {
    this.gestureTimer = clearTimer(this.gestureTimer);
    const generation = this.generation;
    let bufferingChecks = 0;
    const check = () => {
      this.gestureTimer = null;
      if (generation !== this.generation || !this.player) return;
      const state = this.query((p) => p.getPlayerState(), YTState.UNSTARTED);
      if (state === YTState.PLAYING || state === YTState.ENDED) return;
      if (state === YTState.BUFFERING && ++bufferingChecks < MAX_BUFFERING_CHECKS) {
        this.gestureTimer = setTimeout(check, GESTURE_CHECK_MS);
        return;
      }
      if (this.status === "connecting" || this.status === "buffering" || this.status === "playing") {
        this.interrupt("needs-gesture");
      }
    };
    this.gestureTimer = setTimeout(check, GESTURE_CHECK_MS);
  }

  // --- Helpers -----------------------------------------------------------------------------

  /**
   * Tuning in is the listener's own click, so it may start a player that is mostly off-screen (just
   * like resume() and setStation()); never in a hidden tab, though.
   */
  private mayStartNow(): boolean {
    return this.startRequested ? document.visibilityState === "visible" : this.mayAutoplay();
  }

  /** YouTube's rule for playback we start without a click: tab visible and more than half of the player on screen. */
  private mayAutoplay(): boolean {
    return document.visibilityState === "visible" && this.visibleRatio >= MIN_VISIBLE_RATIO;
  }

  private playingOtherVideo(slot: Slot): boolean {
    const id = this.query<string | null>((p) => new URL(p.getVideoUrl()).searchParams.get("v"), null);
    return typeof id === "string" && id !== "" && id !== slot.track.id;
  }

  private setMuted(muted: boolean): void {
    this.muted = muted;
    this.command((p) => (muted ? p.mute() : p.unMute()));
  }

  private applyVolume(): void {
    this.command((p) => {
      p.setVolume(this.volume);
      if (this.muted) p.mute();
      else p.unMute();
    });
  }

  private markOwnAction(): void {
    this.ownActionAt = performance.now();
  }

  private withinOwnActionGrace(): boolean {
    return performance.now() - this.ownActionAt < OWN_ACTION_GRACE_MS;
  }

  /** Player calls can throw while its iframe is being torn down; a radio should never crash for that. */
  private command(action: (player: YTPlayer) => void): void {
    const player = this.player;
    if (!player || !this.ready) return;
    try {
      action(player);
    } catch {
      // ignored, see above
    }
  }

  private query<T>(read: (player: YTPlayer) => T, fallback: T): T {
    const player = this.player;
    if (!player || !this.ready) return fallback;
    try {
      return read(player);
    } catch {
      return fallback;
    }
  }

  private setStatus(status: RadioStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.onStatus(status);
  }
}
