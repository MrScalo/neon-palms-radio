import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_STORAGE_KEY, parseStoredConsent } from "../consent";

type ConsentModule = typeof import("../consent");

function fakeStorage(options: { broken?: boolean } = {}): Storage {
  const data = new Map<string, string>();
  const guard = () => {
    if (options.broken) throw new DOMException("denied", "SecurityError");
  };
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (key: string) => {
      guard();
      return data.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      guard();
      data.set(key, value);
    },
    removeItem: (key: string) => {
      guard();
      data.delete(key);
    },
  };
}

async function loadWith(storage: Storage): Promise<ConsentModule> {
  vi.stubGlobal("window", {
    localStorage: storage,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.resetModules();
  return import("../consent");
}

describe("parseStoredConsent", () => {
  it("accepts only a well-formed decision", () => {
    expect(parseStoredConsent(null)).toBe("unknown");
    expect(parseStoredConsent('{"youtube":"granted","at":"2026-11-01T10:00:00.000Z"}')).toBe("granted");
    expect(parseStoredConsent('{"youtube":"denied","at":"2026-11-01T10:00:00.000Z"}')).toBe("denied");
    expect(parseStoredConsent('{"youtube":"maybe"}')).toBe("unknown");
    expect(parseStoredConsent("granted")).toBe("unknown");
    expect(parseStoredConsent("null")).toBe("unknown");
  });
});

describe("consent store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reads an earlier decision from storage", async () => {
    const storage = fakeStorage();
    storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ youtube: "granted", at: "2026-10-01T00:00:00.000Z" }));
    const consent = await loadWith(storage);
    expect(consent.getYouTubeConsent()).toBe("granted");
  });

  it("stores grant/deny with a timestamp and forgets on revoke", async () => {
    const storage = fakeStorage();
    const consent = await loadWith(storage);
    expect(consent.getYouTubeConsent()).toBe("unknown");

    consent.grantYouTubeConsent();
    expect(consent.getYouTubeConsent()).toBe("granted");
    expect(JSON.parse(storage.getItem(CONSENT_STORAGE_KEY) ?? "")).toEqual({
      youtube: "granted",
      at: "2026-11-01T12:00:00.000Z",
    });

    consent.denyYouTubeConsent();
    expect(consent.getYouTubeConsent()).toBe("denied");
    expect(JSON.parse(storage.getItem(CONSENT_STORAGE_KEY) ?? "").youtube).toBe("denied");

    consent.revokeYouTubeConsent();
    expect(consent.getYouTubeConsent()).toBe("unknown");
    expect(storage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });

  it("falls back to memory when storage is unavailable", async () => {
    const consent = await loadWith(fakeStorage({ broken: true }));
    expect(consent.getYouTubeConsent()).toBe("unknown");
    consent.grantYouTubeConsent();
    expect(consent.getYouTubeConsent()).toBe("granted");
    consent.revokeYouTubeConsent();
    expect(consent.getYouTubeConsent()).toBe("unknown");
  });
});
