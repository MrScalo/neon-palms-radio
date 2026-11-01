import { createMemoryStore } from "./memory";
import type { PresenceStore } from "./store";
import { createUpstashStore, type UpstashConfig } from "./upstash";

/** Env vars of the store, in order of preference: Vercel Marketplace names first, then Upstash's own. */
export const REDIS_ENV_PAIRS = [
  { url: "KV_REST_API_URL", token: "KV_REST_API_TOKEN" },
  { url: "UPSTASH_REDIS_REST_URL", token: "UPSTASH_REDIS_REST_TOKEN" },
] as const;

export type PresenceEnv = Readonly<Record<string, string | undefined>>;

export type PresenceStoreChoice =
  | { kind: "upstash"; config: UpstashConfig }
  | { kind: "memory" }
  /** Counting switched off: answers carry `counts: null`. */
  | { kind: "off" };

/**
 * Redis when a complete URL + token pair is set. Without one, process-local counters only off
 * Vercel (`next dev` / `next start`): on Vercel every function instance would count its own share.
 */
export function choosePresenceStore(env: PresenceEnv): PresenceStoreChoice {
  for (const pair of REDIS_ENV_PAIRS) {
    const url = env[pair.url]?.trim();
    const token = env[pair.token]?.trim();
    if (url && token) return { kind: "upstash", config: { url, token } };
  }
  return env.VERCEL ? { kind: "off" } : { kind: "memory" };
}

export function createPresenceStore(env: PresenceEnv): PresenceStore | null {
  const choice = choosePresenceStore(env);
  switch (choice.kind) {
    case "upstash":
      return createUpstashStore(choice.config);
    case "memory":
      return createMemoryStore();
    case "off":
      return null;
  }
}

let store: { current: PresenceStore | null } | undefined;

/** The store for this server process, chosen from its env on first use. */
export function getPresenceStore(): PresenceStore | null {
  store ??= { current: createPresenceStore(process.env) };
  return store.current;
}
