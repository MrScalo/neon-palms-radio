import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ConsentState } from "@/lib/consent";
import { RadioEngine } from "../engine";
import { getSlotAt, liveOffsetSeconds } from "../schedule";
import type { RadioStatus, Slot, Station, Track } from "../types";
import { YT_NOCOOKIE_HOST, YTState, type YTNamespace, type YTPlayer, type YTPlayerOptions } from "../youtube";

type Timer = ReturnType<typeof setTimeout>;
type VideoRequest = { videoId: string; startSeconds?: number };

const READY_MS = 200;
const LOAD_MS = 100;
const BUFFER_MS = 300;

/** Behaves like the IFrame API player as far as the engine can tell; events arrive asynchronously like postMessage. */
class FakePlayer implements YTPlayer {
  static all: FakePlayer[] = [];

  state: number = YTState.UNSTARTED;
  videoId: string;
  destroyed = false;
  loads: VideoRequest[] = [];
  cues: VideoRequest[] = [];
  seeks: Array<{ at: number; to: number }> = [];
  plays = 0;
  pauses = 0;
  errorsAt: number[] = [];
  /** When set, every load fails with this error code. */
  failLoadsWith: number | null = null;
  /** When false, seeks don't move the position (drift stays). */
  seekWorks = true;
  private pos: number;
  private since: number | null = null;
  private pending: Timer | null = null;

  constructor(
    _element: HTMLElement,
    readonly options: YTPlayerOptions,
  ) {
    FakePlayer.all.push(this);
    this.videoId = options.videoId ?? "";
    this.pos = options.playerVars?.start ?? 0;
    setTimeout(() => {
      if (!this.destroyed) options.events?.onReady?.({ target: this });
    }, READY_MS);
  }

  playVideo(): void {
    this.plays += 1;
    if (this.state === YTState.PLAYING || this.state === YTState.BUFFERING) return;
    this.bufferThenPlay();
  }

  pauseVideo(): void {
    this.pauses += 1;
    this.cancelPending();
    this.setState(YTState.PAUSED);
  }

  seekTo(seconds: number): void {
    this.seeks.push({ at: Date.now(), to: seconds });
    if (this.seekWorks) {
      this.pos = seconds;
      if (this.since !== null) this.since = Date.now();
    }
    // Like the real player: a paused video stays paused, anything else plays.
    if (this.state !== YTState.PAUSED) this.bufferThenPlay();
  }

  loadVideoById(request: VideoRequest): void {
    this.loads.push(request);
    this.startOver(request.videoId, request.startSeconds ?? 0);
    this.setState(YTState.UNSTARTED);
    const code = this.failLoadsWith;
    if (code !== null) {
      this.later(50, () => this.error(code));
      return;
    }
    this.later(LOAD_MS, () => this.bufferThenPlay());
  }

  cueVideoById(request: VideoRequest): void {
    this.cues.push(request);
    this.startOver(request.videoId, request.startSeconds ?? 0);
    this.setState(YTState.CUED);
  }

  getCurrentTime(): number {
    return this.since === null ? this.pos : this.pos + (Date.now() - this.since) / 1000;
  }

  getPlayerState(): number {
    return this.state;
  }

  getVideoUrl(): string {
    return `https://www.youtube.com/watch?v=${this.videoId}`;
  }

  setVolume(): void {}
  mute(): void {}
  unMute(): void {}

  destroy(): void {
    this.destroyed = true;
    this.cancelPending();
  }

  // --- Test controls ---

  error(code: number): void {
    this.errorsAt.push(Date.now());
    this.options.events?.onError?.({ target: this, data: code });
  }

  /** Dispatches a state event without changing the actual state (a transient blip). */
  fire(state: number): void {
    this.options.events?.onStateChange?.({ target: this, data: state });
  }

  /** Shifts the playback position, as if the video stalled or skipped. */
  drift(seconds: number): void {
    this.pos += seconds;
  }

  /** The listener picks another video inside the embed. */
  switchVideo(videoId: string): void {
    this.startOver(videoId, 0);
    this.bufferThenPlay();
  }

  /** Another video at `seconds`: the old one's playing time must not carry over. */
  private startOver(videoId: string, seconds: number): void {
    this.cancelPending();
    this.videoId = videoId;
    this.since = null;
    this.pos = seconds;
  }

  private bufferThenPlay(): void {
    this.setState(YTState.BUFFERING);
    this.later(BUFFER_MS, () => this.setState(YTState.PLAYING));
  }

  private setState(state: number): void {
    if (this.state === YTState.PLAYING && state !== YTState.PLAYING) {
      this.pos = this.getCurrentTime();
      this.since = null;
    }
    if (state === YTState.PLAYING && this.since === null) this.since = Date.now();
    this.state = state;
    setTimeout(() => {
      if (!this.destroyed) this.options.events?.onStateChange?.({ target: this, data: state });
    }, 0);
  }

  private later(ms: number, action: () => void): void {
    this.cancelPending();
    this.pending = setTimeout(() => {
      this.pending = null;
      if (!this.destroyed) action();
    }, ms);
  }

  private cancelPending(): void {
    if (this.pending !== null) clearTimeout(this.pending);
    this.pending = null;
  }
}

class FakeIntersectionObserver {
  static last: FakeIntersectionObserver | null = null;
  disconnected = false;

  constructor(private readonly callback: (entries: IntersectionObserverEntry[]) => void) {
    FakeIntersectionObserver.last = this;
  }

  observe(): void {}

  disconnect(): void {
    this.disconnected = true;
  }

  report(ratio: number): void {
    this.callback([{ intersectionRatio: ratio, isIntersecting: ratio > 0 } as IntersectionObserverEntry]);
  }
}

function track(id: string, artist: string, duration: number): Track {
  return { id, artist, title: `Song ${id}`, year: 1985, duration, channel: artist };
}

function station(id: string, tracks: Track[]): Station {
  return { id, slug: id, name: id, frequency: "88.6", tagline: "", description: "", accent: "#ff2fa0", tracks };
}

const HOME = station("home", [
  track("homeTrack01", "Artist A", 214),
  track("homeTrack02", "Artist B", 187),
  track("homeTrack03", "Artist C", 263),
  track("homeTrack04", "Artist D", 241),
  track("homeTrack05", "Artist E", 198),
]);
const OTHER = station("other", [
  track("otherTrk001", "Artist F", 231),
  track("otherTrk002", "Artist G", 305),
  track("otherTrk003", "Artist H", 176),
  track("otherTrk004", "Artist I", 222),
]);

const api = { Player: FakePlayer } as unknown as YTNamespace;
const host = { replaceChildren() {}, appendChild() {} } as unknown as HTMLDivElement;

let statuses: RadioStatus[];
let consent: ConsentState;
let visibility: DocumentVisibilityState;
let visibilityListeners: Set<() => void>;
let loadApi: Mock<() => Promise<YTNamespace>>;

function createEngine(initial: Station = HOME): RadioEngine {
  return new RadioEngine((status) => statuses.push(status), {
    now: () => Date.now(),
    loadApi,
    getConsent: () => consent,
    station: initial,
  });
}

const lastStatus = () => statuses[statuses.length - 1];
const player = () => FakePlayer.all[FakePlayer.all.length - 1];
const observer = () => FakeIntersectionObserver.last!;
const live = (slot: Slot) => liveOffsetSeconds(slot, Date.now());
const nextSlot = (slot: Slot, on: Station = HOME) => getSlotAt(slot.endsAt, on);

function setVisibility(state: DocumentVisibilityState): void {
  visibility = state;
  for (const listener of [...visibilityListeners]) listener();
}

/** Tunes in `offsetMs` into a slot and lets it settle into "playing". */
async function tunedIn(offsetMs = 10_000): Promise<{ engine: RadioEngine; slot: Slot; player: FakePlayer }> {
  const slot = getSlotAt(Date.now(), HOME);
  vi.setSystemTime(slot.startsAt + offsetMs);
  const engine = createEngine();
  engine.tuneIn(host);
  await vi.advanceTimersByTimeAsync(2_000);
  expect(lastStatus()).toBe("playing");
  return { engine, slot, player: player() };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance"] });
  vi.setSystemTime(Date.UTC(2026, 10, 1, 17, 0, 0));
  FakePlayer.all = [];
  FakeIntersectionObserver.last = null;
  statuses = [];
  consent = "granted";
  visibility = "visible";
  visibilityListeners = new Set();
  loadApi = vi.fn(() => Promise.resolve(api));
  vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } });
  vi.stubGlobal("document", {
    get visibilityState() {
      return visibility;
    },
    addEventListener: (type: string, listener: () => void) => {
      if (type === "visibilitychange") visibilityListeners.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) => {
      if (type === "visibilitychange") visibilityListeners.delete(listener);
    },
    createElement: () => ({}),
  });
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("RadioEngine: staying live", () => {
  it("tunes in mid-slot at the live position", async () => {
    const slot = getSlotAt(Date.now(), HOME);
    vi.setSystemTime(slot.startsAt + 42_300);
    createEngine().tuneIn(host);
    expect(lastStatus()).toBe("connecting");

    await vi.advanceTimersByTimeAsync(0);
    const created = player();
    expect(created.options.host).toBe(YT_NOCOOKIE_HOST);
    expect(created.options.videoId).toBe(slot.track.id);
    expect(created.options.playerVars?.start).toBe(42);

    await vi.advanceTimersByTimeAsync(READY_MS);
    expect(created.seeks).toHaveLength(1);
    expect(created.seeks[0].to).toBeCloseTo(live(slot) + 0.4, 2);
    expect(created.plays).toBe(1);

    await vi.advanceTimersByTimeAsync(BUFFER_MS + 10);
    expect(lastStatus()).toBe("playing");
    expect(Math.abs(created.getCurrentTime() - live(slot))).toBeLessThan(0.5);
  });

  it("refuses to tune in without consent", async () => {
    consent = "denied";
    createEngine().tuneIn(host);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(loadApi).not.toHaveBeenCalled();
    expect(FakePlayer.all).toHaveLength(0);
    expect(statuses).toEqual([]);
  });

  it("loads the next slot exactly once at the boundary, at its live offset", async () => {
    const { slot, player: p } = await tunedIn();
    await vi.advanceTimersByTimeAsync(slot.endsAt - Date.now() - 1_000);
    expect(p.loads).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1_100);
    const next = nextSlot(slot);
    expect(p.loads).toHaveLength(1);
    expect(p.loads[0].videoId).toBe(next.track.id);
    expect(p.loads[0].startSeconds).toBeGreaterThan(0);
    expect(p.loads[0].startSeconds).toBeLessThan(0.1);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(p.loads).toHaveLength(1);
    expect(lastStatus()).toBe("playing");
  });

  it("does not correct small drift", async () => {
    const { player: p } = await tunedIn();
    await vi.advanceTimersByTimeAsync(10_000);
    const seeks = p.seeks.length;
    p.drift(-2);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(p.seeks).toHaveLength(seeks);
  });

  it("seeks back to live once when drift exceeds 2.5 s", async () => {
    const { slot, player: p } = await tunedIn();
    await vi.advanceTimersByTimeAsync(10_000);
    p.drift(-5);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(p.seeks).toHaveLength(2);
    expect(Math.abs(p.getCurrentTime() - live(slot))).toBeLessThan(1);
  });

  it("corrects persistent drift at most once every 8 s", async () => {
    const { player: p } = await tunedIn();
    p.seekWorks = false;
    p.drift(-5);
    await vi.advanceTimersByTimeAsync(40_000);
    const corrections = p.seeks.slice(1);
    expect(corrections.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < corrections.length; i++) {
      expect(corrections[i].at - corrections[i - 1].at).toBeGreaterThanOrEqual(8_000);
    }
  });

  it("ignores a PAUSED event right after its own seek, but not a later pause", async () => {
    const { player: p } = await tunedIn();
    await vi.advanceTimersByTimeAsync(10_000);
    p.drift(-5);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(p.seeks).toHaveLength(2);

    p.fire(YTState.PAUSED);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(statuses).not.toContain("paused");
    expect(lastStatus()).toBe("playing");

    p.pauseVideo();
    await vi.advanceTimersByTimeAsync(10);
    expect(lastStatus()).toBe("paused");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(lastStatus()).toBe("paused");
  });

  it("jumps back to live when the listener restarts a paused video", async () => {
    const { slot, player: p } = await tunedIn();
    p.pauseVideo();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(lastStatus()).toBe("paused");

    p.playVideo();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(lastStatus()).toBe("playing");
    expect(Math.abs(p.getCurrentTime() - live(slot))).toBeLessThan(1);
  });

  it("tuneOut destroys the player and ignores its late events", async () => {
    const { engine, player: p } = await tunedIn();
    engine.tuneOut();
    expect(p.destroyed).toBe(true);
    expect(observer().disconnected).toBe(true);
    expect(lastStatus()).toBe("off");
    expect(visibilityListeners.size).toBe(0);

    const count = statuses.length;
    p.options.events?.onStateChange?.({ target: p, data: YTState.PLAYING });
    p.options.events?.onError?.({ target: p, data: 150 });
    p.options.events?.onReady?.({ target: p });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(statuses).toHaveLength(count);
    expect(FakePlayer.all).toHaveLength(1);
  });

  it("a fresh tune-in after tuneOut gets a new player that is not confused by the old one", async () => {
    const { engine, player: old } = await tunedIn();
    engine.tuneOut();
    engine.tuneIn(host);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(FakePlayer.all).toHaveLength(2);
    expect(lastStatus()).toBe("playing");
    old.options.events?.onStateChange?.({ target: old, data: YTState.PAUSED });
    await vi.advanceTimersByTimeAsync(10);
    expect(lastStatus()).toBe("playing");
  });
});

describe("RadioEngine: errors", () => {
  it("loses the signal on an unplayable video until the next slot, without retrying", async () => {
    const { slot, player: p } = await tunedIn();
    p.error(150);
    expect(lastStatus()).toBe("signal-lost");

    await vi.advanceTimersByTimeAsync(slot.endsAt - Date.now() - 500);
    expect(p.loads).toHaveLength(0);
    expect(lastStatus()).toBe("signal-lost");

    await vi.advanceTimersByTimeAsync(2_000);
    expect(p.loads).toHaveLength(1);
    expect(p.loads[0].videoId).toBe(nextSlot(slot).track.id);
    expect(lastStatus()).toBe("playing");
  });

  it("retries a temporary error at 5, 15 and 30 s, then gives up until the next slot", async () => {
    const { slot, player: p } = await tunedIn();
    p.failLoadsWith = 5;
    p.error(5);
    expect(lastStatus()).toBe("buffering");

    for (const [delay, loadsBefore] of [
      [5_000, 0],
      [15_000, 1],
      [30_000, 2],
    ] as const) {
      const failedAt = p.errorsAt[p.errorsAt.length - 1];
      await vi.advanceTimersByTimeAsync(failedAt + delay - 100 - Date.now());
      expect(p.loads).toHaveLength(loadsBefore);
      expect(lastStatus()).toBe("buffering");
      // Picked up by the next once-a-second sync.
      await vi.advanceTimersByTimeAsync(1_100);
      expect(p.loads).toHaveLength(loadsBefore + 1);
      const retry = p.loads[loadsBefore];
      expect(retry.videoId).toBe(slot.track.id);
      expect(Math.abs((retry.startSeconds ?? 0) - live(slot))).toBeLessThan(1.1);
      // The fake fails the load 50 ms later.
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(lastStatus()).toBe("signal-lost");
    expect(statuses).not.toContain("needs-gesture");

    p.failLoadsWith = null;
    await vi.advanceTimersByTimeAsync(slot.endsAt - Date.now() - 500);
    expect(p.loads).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(p.loads).toHaveLength(4);
    expect(p.loads[3].videoId).toBe(nextSlot(slot).track.id);
    expect(lastStatus()).toBe("playing");
  });

  it("recovers within the same slot when the IFrame API fails to load once", async () => {
    loadApi.mockRejectedValueOnce(new Error("offline"));
    const slot = getSlotAt(Date.now(), HOME);
    vi.setSystemTime(slot.startsAt + 10_000);
    createEngine().tuneIn(host);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("connecting");
    expect(FakePlayer.all).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(6_000);
    expect(loadApi).toHaveBeenCalledTimes(2);
    expect(lastStatus()).toBe("playing");
    expect(player().videoId).toBe(slot.track.id);
    expect(Math.abs(player().getCurrentTime() - live(slot))).toBeLessThan(1);
    expect(statuses).not.toContain("signal-lost");
  });

  it("retries with a new player when the player never becomes ready", async () => {
    const slot = getSlotAt(Date.now(), HOME);
    vi.setSystemTime(slot.startsAt + 10_000);
    const silent = {
      Player: class {
        constructor() {
          FakePlayer.all.push(this as unknown as FakePlayer);
        }
        destroy() {}
      },
    } as unknown as YTNamespace;
    loadApi.mockResolvedValueOnce(silent);
    createEngine().tuneIn(host);
    await vi.advanceTimersByTimeAsync(20_500);
    expect(lastStatus()).toBe("connecting");

    await vi.advanceTimersByTimeAsync(7_000);
    expect(FakePlayer.all).toHaveLength(2);
    expect(lastStatus()).toBe("playing");
    expect(statuses).not.toContain("signal-lost");
  });
});

describe("RadioEngine: only plays where the listener can see it", () => {
  it("pauses when the tab is hidden and jumps back to live when it is visible again", async () => {
    const { slot, player: p } = await tunedIn();
    setVisibility("hidden");
    expect(p.pauses).toBe(1);
    expect(lastStatus()).toBe("paused");

    await vi.advanceTimersByTimeAsync(20_000);
    expect(lastStatus()).toBe("paused");
    expect(p.getPlayerState()).toBe(YTState.PAUSED);
    const plays = p.plays;

    setVisibility("visible");
    expect(p.seeks[p.seeks.length - 1].to).toBeCloseTo(live(slot) + 0.4, 2);
    expect(p.plays).toBe(plays + 1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
  });

  it("never starts the next slot in a hidden tab, and catches up on return", async () => {
    const { slot, player: p } = await tunedIn();
    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(slot.endsAt - Date.now() + 30_000);
    expect(p.loads).toHaveLength(0);
    expect(lastStatus()).toBe("paused");

    setVisibility("visible");
    const next = nextSlot(slot);
    expect(p.loads).toHaveLength(1);
    expect(p.loads[0].videoId).toBe(next.track.id);
    expect(p.loads[0].startSeconds).toBeCloseTo(live(next), 2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
  });

  it("only cues a new slot while the tab is hidden", async () => {
    const { slot, player: p } = await tunedIn();
    p.error(150);
    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(slot.endsAt - Date.now() + 1_000);
    const next = nextSlot(slot);
    expect(p.loads).toHaveLength(0);
    expect(p.cues).toHaveLength(1);
    expect(p.cues[0].videoId).toBe(next.track.id);
    expect(lastStatus()).toBe("paused");

    await vi.advanceTimersByTimeAsync(5_000);
    setVisibility("visible");
    expect(p.seeks[p.seeks.length - 1].to).toBeCloseTo(live(next) + 0.4, 2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
  });

  it("keeps playing a track while scrolled away but only cues the next one", async () => {
    const { slot, player: p } = await tunedIn();
    observer().report(0.3);
    await vi.advanceTimersByTimeAsync(slot.endsAt - Date.now() - 1_000);
    expect(lastStatus()).toBe("playing");
    expect(p.pauses).toBe(0);

    await vi.advanceTimersByTimeAsync(2_000);
    const next = nextSlot(slot);
    expect(p.loads).toHaveLength(0);
    expect(p.cues).toEqual([{ videoId: next.track.id, startSeconds: expect.any(Number) }]);
    expect(lastStatus()).toBe("paused");

    await vi.advanceTimersByTimeAsync(5_000);
    expect(p.loads).toHaveLength(0);
    const plays = p.plays;

    observer().report(1);
    expect(p.seeks[p.seeks.length - 1].to).toBeCloseTo(live(next) + 0.4, 2);
    expect(p.plays).toBe(plays + 1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
    expect(Math.abs(p.getCurrentTime() - live(next))).toBeLessThan(1);
  });

  it("starts playing after Tune in even while most of the player is off-screen", async () => {
    const slot = getSlotAt(Date.now(), HOME);
    vi.setSystemTime(slot.startsAt + 10_000);
    const engine = createEngine();
    engine.tuneIn(host);
    observer().report(0.2);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(player().cues).toHaveLength(0);
    expect(lastStatus()).toBe("playing");
    engine.tuneOut();
  });

  it("does not start after Tune in once the tab is hidden before the player is ready", async () => {
    const slot = getSlotAt(Date.now(), HOME);
    vi.setSystemTime(slot.startsAt + 10_000);
    const engine = createEngine();
    engine.tuneIn(host);
    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(player().loads).toHaveLength(0);
    expect(player().cues).toHaveLength(1);
    expect(lastStatus()).toBe("paused");
    engine.tuneOut();
  });

  it("lets the listener's own click play while the player is mostly off-screen", async () => {
    const { engine, slot, player: p } = await tunedIn();
    observer().report(0.3);
    await vi.advanceTimersByTimeAsync(slot.endsAt - Date.now() + 1_000);
    expect(lastStatus()).toBe("paused");

    engine.resume();
    expect(p.plays).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
  });

  it("holds a player that becomes ready in a hidden tab", async () => {
    const slot = getSlotAt(Date.now(), HOME);
    vi.setSystemTime(slot.startsAt + 10_000);
    createEngine().tuneIn(host);
    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(5_000);
    const p = player();
    expect(p.plays).toBe(0);
    expect(p.seeks).toHaveLength(0);
    expect(p.cues).toHaveLength(1);
    expect(lastStatus()).toBe("paused");

    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
    expect(Math.abs(p.getCurrentTime() - live(slot))).toBeLessThan(1);
  });

  it("does not resume by itself after the listener paused", async () => {
    const { player: p } = await tunedIn();
    p.pauseVideo();
    await vi.advanceTimersByTimeAsync(10);
    expect(lastStatus()).toBe("paused");
    setVisibility("hidden");
    setVisibility("visible");
    observer().report(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(lastStatus()).toBe("paused");
    expect(p.getPlayerState()).toBe(YTState.PAUSED);
  });
});

describe("RadioEngine: only the scheduled video", () => {
  it("causes no extra loads during normal playback", async () => {
    const { slot, player: p } = await tunedIn();
    await vi.advanceTimersByTimeAsync(slot.endsAt - Date.now() - 1_000);
    expect(p.loads).toHaveLength(0);
  });

  it("goes back to the scheduled video when another one plays in the embed", async () => {
    const { slot, player: p } = await tunedIn();
    await vi.advanceTimersByTimeAsync(5_000);
    p.switchVideo("aaaaaaaaaaa");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(p.loads).toHaveLength(1);
    expect(p.loads[0].videoId).toBe(slot.track.id);
    expect(p.loads[0].startSeconds).toBeGreaterThan(15);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(p.loads).toHaveLength(1);
    expect(lastStatus()).toBe("playing");
  });
});

describe("RadioEngine: switching stations", () => {
  /** 10 s into a HOME slot at which both HOME's and OTHER's songs have at least `margin` ms left. */
  function calmMoment(margin = 60_000): number {
    let slot = getSlotAt(Date.now(), HOME);
    for (;;) {
      const at = slot.startsAt + 10_000;
      if (slot.endsAt - at >= margin && getSlotAt(at, OTHER).endsAt - at >= margin) return at;
      slot = nextSlot(slot);
    }
  }

  async function tunedInCalm(): Promise<{ engine: RadioEngine; player: FakePlayer }> {
    vi.setSystemTime(calmMoment());
    const engine = createEngine();
    engine.tuneIn(host);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(lastStatus()).toBe("playing");
    return { engine, player: player() };
  }

  it("loads the other station's live slot exactly once, right inside the click", async () => {
    const { engine, player: p } = await tunedInCalm();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(p.loads).toHaveLength(0);

    engine.setStation(OTHER);
    const other = getSlotAt(Date.now(), OTHER);
    expect(p.loads).toEqual([{ videoId: other.track.id, startSeconds: expect.any(Number) }]);
    expect(p.loads[0].startSeconds).toBeCloseTo(live(other), 2);
    expect(lastStatus()).toBe("buffering");

    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
    expect(Math.abs(p.getCurrentTime() - live(other))).toBeLessThan(1);

    await vi.advanceTimersByTimeAsync(other.endsAt - Date.now() - 1_000);
    expect(p.loads).toHaveLength(1);
    expect(FakePlayer.all).toHaveLength(1);

    // From now on it follows the other station's schedule.
    await vi.advanceTimersByTimeAsync(1_100);
    expect(p.loads).toHaveLength(2);
    expect(p.loads[1].videoId).toBe(nextSlot(other, OTHER).track.id);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
  });

  it("does nothing when the selected station is chosen again", async () => {
    const { engine, player: p } = await tunedInCalm();
    engine.setStation(HOME);
    engine.setStation({ ...HOME });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(p.loads).toHaveLength(0);
    expect(lastStatus()).toBe("playing");
  });

  it("only changes the selection while off, and tunes in to it later", async () => {
    vi.setSystemTime(calmMoment());
    const engine = createEngine();
    engine.setStation(OTHER);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(loadApi).not.toHaveBeenCalled();
    expect(FakePlayer.all).toHaveLength(0);
    expect(statuses).toEqual([]);

    engine.tuneIn(host);
    await vi.advanceTimersByTimeAsync(2_000);
    const other = getSlotAt(Date.now(), OTHER);
    expect(player().options.videoId).toBe(other.track.id);
    expect(lastStatus()).toBe("playing");
    expect(Math.abs(player().getCurrentTime() - live(other))).toBeLessThan(1);
  });

  it("does not touch a torn-down player when switching after tuneOut", async () => {
    const { engine, player: p } = await tunedInCalm();
    engine.tuneOut();
    const count = statuses.length;
    engine.setStation(OTHER);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(p.loads).toHaveLength(0);
    expect(FakePlayer.all).toHaveLength(1);
    expect(statuses).toHaveLength(count);
  });

  it("always loads on a switch, even when both stations are at the same cycle and index", async () => {
    const soloA = station("solo-a", [track("soloTrackAA", "Solo A", 240)]);
    const soloB = station("solo-b", [track("soloTrackBB", "Solo B", 240)]);
    const start = getSlotAt(Date.now(), soloA);
    vi.setSystemTime(start.startsAt + 10_000);
    const engine = createEngine(soloA);
    engine.tuneIn(host);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(lastStatus()).toBe("playing");

    const a = getSlotAt(Date.now(), soloA);
    const b = getSlotAt(Date.now(), soloB);
    expect([b.cycle, b.index]).toEqual([a.cycle, a.index]);
    engine.setStation(soloB);
    expect(player().loads).toEqual([{ videoId: "soloTrackBB", startSeconds: expect.any(Number) }]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
  });

  it("starts the other station when the listener had paused", async () => {
    const { engine, player: p } = await tunedInCalm();
    p.pauseVideo();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(lastStatus()).toBe("paused");

    engine.setStation(OTHER);
    expect(p.loads).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
    expect(p.videoId).toBe(getSlotAt(Date.now(), OTHER).track.id);
  });

  it("forgets the old station's failures and retries", async () => {
    const { engine, player: p } = await tunedInCalm();
    p.error(150);
    expect(lastStatus()).toBe("signal-lost");

    engine.setStation(OTHER);
    expect(p.loads).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");

    p.failLoadsWith = 5;
    p.error(5);
    expect(lastStatus()).toBe("buffering");
    p.failLoadsWith = null;
    engine.setStation(HOME);
    expect(p.loads).toHaveLength(2);
    expect(p.loads[1].videoId).toBe(getSlotAt(Date.now(), HOME).track.id);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(p.loads).toHaveLength(2);
  });

  it("only cues the other station in a hidden tab", async () => {
    const { engine, player: p } = await tunedInCalm();
    setVisibility("hidden");
    expect(lastStatus()).toBe("paused");

    engine.setStation(OTHER);
    const other = getSlotAt(Date.now(), OTHER);
    expect(p.loads).toHaveLength(0);
    expect(p.cues).toEqual([{ videoId: other.track.id, startSeconds: expect.any(Number) }]);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(lastStatus()).toBe("paused");
    expect(p.plays).toBe(1);

    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(lastStatus()).toBe("playing");
    expect(Math.abs(p.getCurrentTime() - live(other))).toBeLessThan(1);
  });

  it("brings a player that is still coming up straight to the other station", async () => {
    vi.setSystemTime(calmMoment());
    const engine = createEngine();
    engine.tuneIn(host);
    await vi.advanceTimersByTimeAsync(0);
    const p = player();
    expect(p.options.videoId).toBe(getSlotAt(Date.now(), HOME).track.id);

    engine.setStation(OTHER);
    expect(lastStatus()).toBe("connecting");
    await vi.advanceTimersByTimeAsync(2_000);
    const other = getSlotAt(Date.now(), OTHER);
    expect(p.loads).toEqual([{ videoId: other.track.id, startSeconds: expect.any(Number) }]);
    expect(lastStatus()).toBe("playing");
    expect(Math.abs(p.getCurrentTime() - live(other))).toBeLessThan(1);
    expect(FakePlayer.all).toHaveLength(1);
  });

  it("creates the player for the other station when switched while the IFrame API loads", async () => {
    vi.setSystemTime(calmMoment());
    const engine = createEngine();
    engine.tuneIn(host);
    engine.setStation(OTHER);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(loadApi).toHaveBeenCalledTimes(1);
    expect(player().options.videoId).toBe(getSlotAt(Date.now(), OTHER).track.id);
    expect(player().loads).toHaveLength(0);
    expect(lastStatus()).toBe("playing");
  });
});
