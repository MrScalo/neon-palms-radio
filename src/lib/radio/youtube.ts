/**
 * Loader and minimal hand-written types for the YouTube IFrame Player API — only the parts the
 * radio uses. Loading it contacts YouTube, so it must only ever be called after consent.
 */

export const YT_API_SRC = "https://www.youtube.com/iframe_api";
/** Privacy-enhanced embed host. */
export const YT_NOCOOKIE_HOST = "https://www.youtube-nocookie.com";

const LOAD_TIMEOUT_MS = 15_000;

export const YTState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  cueVideoById(options: { videoId: string; startSeconds?: number }): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  /** youtube.com watch URL of the loaded video */
  getVideoUrl(): string;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
};

export type YTPlayerEvent = { target: YTPlayer };
export type YTDataEvent = { target: YTPlayer; data: number };

export type YTPlayerVars = {
  autoplay?: 0 | 1;
  controls?: 0 | 1;
  disablekb?: 0 | 1;
  fs?: 0 | 1;
  iv_load_policy?: 1 | 3;
  playsinline?: 0 | 1;
  rel?: 0 | 1;
  start?: number;
  origin?: string;
};

export type YTPlayerOptions = {
  host?: string;
  width?: string | number;
  height?: string | number;
  videoId?: string;
  playerVars?: YTPlayerVars;
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTDataEvent) => void;
    onError?: (event: YTDataEvent) => void;
    onAutoplayBlocked?: (event: YTPlayerEvent) => void;
  };
};

export type YTNamespace = {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
};

type YTWindow = Window & {
  YT?: Partial<YTNamespace>;
  onYouTubeIframeAPIReady?: () => void;
};

/** id YouTube's iframe_api bootstrap gives the www-widgetapi.js tag it injects */
const WIDGET_SCRIPT_ID = "www-widgetapi-script";

let pending: Promise<YTNamespace> | null = null;

function readyNamespace(w: YTWindow): YTNamespace | null {
  return typeof w.YT?.Player === "function" ? (w.YT as YTNamespace) : null;
}

/**
 * The iframe_api bootstrap leaves `YT = { loading: 1 }` behind when www-widgetapi.js fails and
 * skips the widget on every later run while that stub exists, so a retry could never succeed.
 */
function clearStaleBootstrap(w: YTWindow): void {
  if (w.YT === undefined || w.YT === null || readyNamespace(w)) return;
  // Not `delete`: the bootstrap's top-level `var YT` makes the property non-configurable.
  w.YT = undefined;
  document.getElementById(WIDGET_SCRIPT_ID)?.remove();
}

/**
 * Injects the IFrame API script once and resolves with `window.YT` when it is ready.
 * Rejects on script error or after 15 s; a later call then tries again.
 */
export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The YouTube IFrame API can only be loaded in the browser."));
  }
  const w = window as YTWindow;
  const ready = readyNamespace(w);
  if (ready) return Promise.resolve(ready);
  if (pending) return pending;

  const attempt = new Promise<YTNamespace>((resolve, reject) => {
    const previousHandler = w.onYouTubeIframeAPIReady;
    let script: HTMLScriptElement | null = null;
    let settled = false;

    const timeout = setTimeout(() => fail(new Error("The YouTube IFrame API did not load in time.")), LOAD_TIMEOUT_MS);

    function settle(): boolean {
      if (settled) return false;
      settled = true;
      clearTimeout(timeout);
      return true;
    }

    function fail(error: Error): void {
      if (!settle()) return;
      // Restore the page's own handler and drop our tag so a retry starts from scratch.
      if (w.onYouTubeIframeAPIReady === handleReady) w.onYouTubeIframeAPIReady = previousHandler;
      script?.remove();
      clearStaleBootstrap(w);
      reject(error);
    }

    function handleReady(): void {
      try {
        previousHandler?.();
      } finally {
        const api = readyNamespace(w);
        if (api) {
          if (settle()) resolve(api);
        } else {
          fail(new Error("The YouTube IFrame API loaded without a Player."));
        }
      }
    }

    clearStaleBootstrap(w);
    w.onYouTubeIframeAPIReady = handleReady;
    script = document.createElement("script");
    script.src = YT_API_SRC;
    script.async = true;
    script.onerror = () => fail(new Error("The YouTube IFrame API script failed to load."));
    document.head.appendChild(script);
  });

  pending = attempt;
  attempt.catch(() => {
    if (pending === attempt) pending = null;
  });
  return attempt;
}
