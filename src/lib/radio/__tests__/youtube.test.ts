import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type YouTubeModule = typeof import("../youtube");

type FakeScript = { src: string; async: boolean; onerror: (() => void) | null; remove: () => void };

let scripts: FakeScript[];
let win: { YT?: unknown; onYouTubeIframeAPIReady?: () => void };

async function load(): Promise<YouTubeModule> {
  vi.resetModules();
  return import("../youtube");
}

function becomeReady(): void {
  win.YT = { Player: function Player() {} };
  win.onYouTubeIframeAPIReady?.();
}

beforeEach(() => {
  vi.useFakeTimers();
  scripts = [];
  win = {};
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    createElement: () => {
      const script: FakeScript = { src: "", async: false, onerror: null, remove: vi.fn() };
      return script;
    },
    getElementById: () => null,
    head: { appendChild: (script: FakeScript) => scripts.push(script) },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("loadYouTubeIframeApi", () => {
  it("injects the script once and resolves every caller when the API is ready", async () => {
    const { loadYouTubeIframeApi, YT_API_SRC } = await load();
    const first = loadYouTubeIframeApi();
    const second = loadYouTubeIframeApi();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(YT_API_SRC);

    becomeReady();
    await expect(first).resolves.toBe(win.YT);
    await expect(second).resolves.toBe(win.YT);
    await expect(loadYouTubeIframeApi()).resolves.toBe(win.YT);
    expect(scripts).toHaveLength(1);
  });

  it("does not inject anything when the API is already present", async () => {
    win.YT = { Player: function Player() {} };
    const { loadYouTubeIframeApi } = await load();
    await expect(loadYouTubeIframeApi()).resolves.toBe(win.YT);
    expect(scripts).toHaveLength(0);
  });

  it("keeps an existing onYouTubeIframeAPIReady handler working", async () => {
    const existing = vi.fn();
    win.onYouTubeIframeAPIReady = existing;
    const { loadYouTubeIframeApi } = await load();
    const loading = loadYouTubeIframeApi();
    becomeReady();
    await loading;
    expect(existing).toHaveBeenCalledOnce();
  });

  it("rejects on a script error and injects again on retry", async () => {
    const { loadYouTubeIframeApi } = await load();
    const failing = loadYouTubeIframeApi();
    scripts[0].onerror?.();
    await expect(failing).rejects.toThrow(/failed to load/);
    expect(scripts[0].remove).toHaveBeenCalled();

    const retry = loadYouTubeIframeApi();
    expect(scripts).toHaveLength(2);
    becomeReady();
    await expect(retry).resolves.toBe(win.YT);
  });

  it("can retry after www-widgetapi.js failed, although the bootstrap left its YT stub behind", async () => {
    let widgetRequests = 0;
    let firstRun = true;
    const widgetTag = { remove: vi.fn() };
    // Mimics the real iframe_api: `var YT; if (!window.YT) YT = {loading: 0, loaded: 0};
    // if (!YT.loading) { YT.loading = 1; …inject www-widgetapi.js… }`. The top-level `var`
    // makes window.YT non-configurable.
    function runBootstrap(): void {
      if (firstRun) {
        firstRun = false;
        Object.defineProperty(win, "YT", { value: { loading: 0, loaded: 0 }, writable: true, configurable: false });
      } else if (!win.YT) {
        win.YT = { loading: 0, loaded: 0 };
      }
      const yt = win.YT as { loading: number };
      if (!yt.loading) {
        yt.loading = 1;
        widgetRequests += 1;
      }
    }
    vi.stubGlobal("document", {
      createElement: () => ({ src: "", async: false, onerror: null, remove: vi.fn() }),
      getElementById: (id: string) => (id === "www-widgetapi-script" && widgetRequests > 0 ? widgetTag : null),
      head: {
        appendChild: (script: FakeScript) => {
          scripts.push(script);
          runBootstrap();
        },
      },
    });

    const { loadYouTubeIframeApi } = await load();
    const first = loadYouTubeIframeApi();
    const timedOut = expect(first).rejects.toThrow(/did not load in time/);
    // The widget script never arrives.
    await vi.advanceTimersByTimeAsync(15_000);
    await timedOut;
    expect(widgetRequests).toBe(1);
    expect(widgetTag.remove).toHaveBeenCalled();

    const retry = loadYouTubeIframeApi();
    expect(scripts).toHaveLength(2);
    expect(widgetRequests).toBe(2);
    becomeReady();
    await expect(retry).resolves.toBe(win.YT);
  });

  it("rejects after 15 seconds without an answer", async () => {
    const { loadYouTubeIframeApi } = await load();
    const loading = loadYouTubeIframeApi();
    const assertion = expect(loading).rejects.toThrow(/did not load in time/);
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });
});
