import { useMemo, useSyncExternalStore } from "react";

/**
 * The visitor's decision about loading the YouTube player (the only third-party content).
 * - unknown: no decision yet (also the server snapshot)
 * - granted: YouTube may load
 * - denied:  visitor chose "Not now"; remembered so we don't nag, tuning in still asks again
 */
export type ConsentState = "unknown" | "granted" | "denied";

type StoredConsent = { youtube: "granted" | "denied"; at: string };

export const CONSENT_STORAGE_KEY = "neonpalms.consent.v1";

/** Parses the stored JSON; anything malformed counts as no decision. */
export function parseStoredConsent(raw: string | null): ConsentState {
  if (raw === null) return "unknown";
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return "unknown";
    const youtube = (parsed as { youtube?: unknown }).youtube;
    return youtube === "granted" || youtube === "denied" ? youtube : "unknown";
  } catch {
    return "unknown";
  }
}

// Undefined until first read; afterwards the source of truth for this tab, which also covers
// browsers where localStorage throws (e.g. some private modes).
let current: ConsentState | undefined;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readStorage(): ConsentState {
  try {
    return parseStoredConsent(storage()?.getItem(CONSENT_STORAGE_KEY) ?? null);
  } catch {
    return "unknown";
  }
}

function emit(): void {
  for (const listener of [...listeners]) listener();
}

function set(next: ConsentState): void {
  try {
    const store = storage();
    if (next === "unknown") {
      store?.removeItem(CONSENT_STORAGE_KEY);
    } else {
      const value: StoredConsent = { youtube: next, at: new Date().toISOString() };
      store?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(value));
    }
  } catch {
    // Storage unavailable: the decision lives in memory for this page view only.
  }
  if (current === next) return;
  current = next;
  emit();
}

function handleStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== CONSENT_STORAGE_KEY) return;
  const next = readStorage();
  if (next === current) return;
  current = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

/** Current decision, read synchronously (e.g. inside a click handler right after grant()). */
export function getYouTubeConsent(): ConsentState {
  if (typeof window === "undefined") return "unknown";
  if (current === undefined) current = readStorage();
  return current;
}

const getServerSnapshot = (): ConsentState => "unknown";

export function grantYouTubeConsent(): void {
  set("granted");
}

export function denyYouTubeConsent(): void {
  set("denied");
}

/** Forgets the decision entirely, so the visitor is asked again. */
export function revokeYouTubeConsent(): void {
  set("unknown");
}

export function useYouTubeConsent(): {
  consent: ConsentState;
  grant(): void;
  deny(): void;
  revoke(): void;
} {
  const consent = useSyncExternalStore(subscribe, getYouTubeConsent, getServerSnapshot);
  return useMemo(
    () => ({ consent, grant: grantYouTubeConsent, deny: denyYouTubeConsent, revoke: revokeYouTubeConsent }),
    [consent],
  );
}
