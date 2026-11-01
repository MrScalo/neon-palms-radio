import { describe, expect, it, vi } from "vitest";
import { STATIONS } from "@/config/stations";
import { handlePresencePing, MAX_PING_BYTES, parsePingStation } from "../handler";
import { createMemoryStore } from "../memory";
import { PRESENCE_WINDOW_MS, presenceWindow } from "../protocol";
import type { PresenceStore } from "../store";

const IDS = STATIONS.map((station) => station.id);
const NOW = Date.UTC(2026, 10, 1, 12, 0, 10);

function ping(body: BodyInit | null, headers?: HeadersInit): Request {
  return new Request("http://localhost/api/presence", { method: "POST", body, headers });
}

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function streamedPing(chunks: string[]): Request {
  return new Request("http://localhost/api/presence", {
    method: "POST",
    body: streamOf(chunks),
    duplex: "half",
  } as RequestInit);
}

function fakeStore(counts: Awaited<ReturnType<PresenceStore["ping"]>>) {
  return { ping: vi.fn<PresenceStore["ping"]>(async () => counts) };
}

describe("parsePingStation", () => {
  it("accepts a known station id and ignores other fields", () => {
    expect(parsePingStation('{"station":"rearview"}')).toBe("rearview");
    expect(parsePingStation('{"station":"neonpalms","tab":"abc","ts":1}')).toBe("neonpalms");
  });

  it("rejects anything that doesn't name a station exactly", () => {
    for (const body of [
      '{"station":"unknown"}',
      '{"station":"Heatwave"}',
      '{"station":" heatwave"}',
      '{"station":"__proto__"}',
      '{"station":""}',
      '{"station":null}',
      '{"station":1}',
      "{}",
      '["heatwave"]',
      '"heatwave"',
      "null",
      "heatwave",
      "",
    ]) {
      expect(parsePingStation(body), body).toBeNull();
    }
  });
});

describe("handlePresencePing", () => {
  it("counts in the server's current window and answers with the store's counts, never cached", async () => {
    const counts = { total: 5, stations: { heatwave: 2, rearview: 3, neonpalms: 0 } };
    const store = fakeStore(counts);

    const response = await handlePresencePing(ping('{"station":"rearview"}'), store, NOW);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ counts });
    expect(store.ping).toHaveBeenCalledWith("rearview", presenceWindow(NOW), IDS);
  });

  it("answers with the previous window's listeners", async () => {
    const store = createMemoryStore({ now: () => NOW });
    const send = async (station: string, nowMs: number) =>
      (await (await handlePresencePing(ping(JSON.stringify({ station })), store, nowMs)).json()).counts;

    const start = presenceWindow(NOW) * PRESENCE_WINDOW_MS;
    await send("heatwave", start + 1_000);
    await send("heatwave", start + 29_999);
    expect((await send("rearview", start + 15_000)).total).toBe(0);

    expect(await send("neonpalms", start + PRESENCE_WINDOW_MS)).toEqual({
      total: 3,
      stations: { heatwave: 2, rearview: 1, neonpalms: 0 },
    });
  });

  it("rejects unknown stations and broken bodies with 400 and no counts", async () => {
    for (const request of [
      ping('{"station":"talkradio"}'),
      ping("not json"),
      ping(null),
      ping('{"station":"heatwave"', { "Content-Type": "application/json" }),
    ]) {
      const store = fakeStore({ total: 1, stations: {} });
      const response = await handlePresencePing(request, store, NOW);
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ counts: null });
      expect(store.ping).not.toHaveBeenCalled();
    }
  });

  it("rejects bodies over 1 KB, by declared length or while reading", async () => {
    const padded = JSON.stringify({ station: "heatwave", pad: "x".repeat(MAX_PING_BYTES) });
    const exact = JSON.stringify({ station: "heatwave", pad: "" });
    const atLimit = JSON.stringify({ station: "heatwave", pad: "x".repeat(MAX_PING_BYTES - exact.length) });
    expect(atLimit).toHaveLength(MAX_PING_BYTES);

    const store = fakeStore(null);
    for (const request of [
      ping(padded),
      ping('{"station":"heatwave"}', { "Content-Length": "5000" }),
      streamedPing(['{"station":"heatwave","pad":"', "x".repeat(600), "x".repeat(600), '"}']),
    ]) {
      const response = await handlePresencePing(request, store, NOW);
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ counts: null });
    }
    expect(store.ping).not.toHaveBeenCalled();

    const ok = await handlePresencePing(streamedPing([atLimit.slice(0, 500), atLimit.slice(500)]), store, NOW);
    expect(ok.status).toBe(200);
    expect(store.ping).toHaveBeenCalledTimes(1);
  });

  it("answers counts null when counting is off or the store fails", async () => {
    const off = await handlePresencePing(ping('{"station":"heatwave"}'), null, NOW);
    expect(off.status).toBe(200);
    expect(await off.json()).toEqual({ counts: null });

    const failed = await handlePresencePing(ping('{"station":"heatwave"}'), fakeStore(null), NOW);
    expect(failed.status).toBe(200);
    expect(await failed.json()).toEqual({ counts: null });

    const throwing: PresenceStore = { ping: async () => Promise.reject(new Error("boom")) };
    const thrown = await handlePresencePing(ping('{"station":"heatwave"}'), throwing, NOW);
    expect(thrown.status).toBe(200);
    expect(await thrown.json()).toEqual({ counts: null });
  });
});
