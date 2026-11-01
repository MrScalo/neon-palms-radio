import { describe, expect, it } from "vitest";
import { choosePresenceStore, createPresenceStore } from "../config";

const KV = { KV_REST_API_URL: "https://kv.upstash.io", KV_REST_API_TOKEN: "kv-token" };
const UPSTASH = { UPSTASH_REDIS_REST_URL: "https://own.upstash.io", UPSTASH_REDIS_REST_TOKEN: "own-token" };

describe("choosePresenceStore", () => {
  it("prefers the Vercel Marketplace names", () => {
    expect(choosePresenceStore({ ...UPSTASH, ...KV, VERCEL: "1" })).toEqual({
      kind: "upstash",
      config: { url: "https://kv.upstash.io", token: "kv-token" },
    });
  });

  it("falls back to Upstash's own names", () => {
    expect(choosePresenceStore({ ...UPSTASH, VERCEL: "1" })).toEqual({
      kind: "upstash",
      config: { url: "https://own.upstash.io", token: "own-token" },
    });
  });

  it("only takes complete pairs and never mixes them", () => {
    expect(
      choosePresenceStore({ KV_REST_API_URL: KV.KV_REST_API_URL, ...UPSTASH, VERCEL: "1" }),
    ).toEqual({ kind: "upstash", config: { url: "https://own.upstash.io", token: "own-token" } });
    expect(choosePresenceStore({ KV_REST_API_URL: KV.KV_REST_API_URL, UPSTASH_REDIS_REST_TOKEN: "own-token" })).toEqual({
      kind: "memory",
    });
  });

  it("trims values, so a pasted trailing newline doesn't break the token", () => {
    expect(choosePresenceStore({ KV_REST_API_URL: " https://kv.upstash.io\n", KV_REST_API_TOKEN: "kv-token\n" })).toEqual({
      kind: "upstash",
      config: { url: "https://kv.upstash.io", token: "kv-token" },
    });
    expect(choosePresenceStore({ KV_REST_API_URL: "  ", KV_REST_API_TOKEN: "kv-token" })).toEqual({ kind: "memory" });
  });

  it("counts in memory only off Vercel, and not at all on Vercel without Redis", () => {
    expect(choosePresenceStore({})).toEqual({ kind: "memory" });
    expect(choosePresenceStore({ VERCEL: "1" })).toEqual({ kind: "off" });
  });
});

describe("createPresenceStore", () => {
  it("has no store when counting is off", () => {
    expect(createPresenceStore({ VERCEL: "1" })).toBeNull();
    expect(createPresenceStore({})).not.toBeNull();
    expect(createPresenceStore(KV)).not.toBeNull();
  });
});
