import { afterEach, describe, expect, it, vi } from "vitest";
import { countsFromPipelineResponse, createUpstashStore, upstashPipeline } from "../upstash";

const IDS = ["heatwave", "rearview", "neonpalms"];
const CONFIG = { url: "https://example-db.upstash.io/", token: "secret-token" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function okPipeline(values: unknown[]) {
  return [{ result: 4 }, { result: 1 }, { result: values }];
}

afterEach(() => {
  vi.useRealTimers();
});

describe("upstashPipeline", () => {
  it("is INCR + EXPIRE on the current window and one MGET over every station's previous window", () => {
    expect(upstashPipeline("rearview", 100, IDS)).toEqual([
      ["INCR", "np:presence:rearview:100"],
      ["EXPIRE", "np:presence:rearview:100", "120"],
      ["MGET", "np:presence:heatwave:99", "np:presence:rearview:99", "np:presence:neonpalms:99"],
    ]);
  });
});

describe("countsFromPipelineResponse", () => {
  it("reads the MGET result", () => {
    expect(countsFromPipelineResponse(okPipeline(["5", null, "2"]), IDS)).toEqual({
      total: 7,
      stations: { heatwave: 5, rearview: 0, neonpalms: 2 },
    });
  });

  it("is null when any command failed or the shape is off", () => {
    expect(countsFromPipelineResponse([{ result: 1 }, { error: "ERR" }, { result: ["1", "1", "1"] }], IDS)).toBeNull();
    expect(countsFromPipelineResponse([{ result: 1 }, { result: 1 }, { error: "WRONGTYPE" }], IDS)).toBeNull();
    expect(countsFromPipelineResponse(okPipeline(["1", "1"]), IDS)).toBeNull();
    expect(countsFromPipelineResponse([{ result: 1 }, { result: 1 }], IDS)).toBeNull();
    expect(countsFromPipelineResponse({ error: "WRONGPASS" }, IDS)).toBeNull();
    expect(countsFromPipelineResponse([null, { result: 1 }, { result: ["1", "1", "1"] }], IDS)).toBeNull();
  });
});

describe("Upstash store", () => {
  it("sends exactly one pipeline request with the token as bearer", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(okPipeline(["3", "1", null])));
    const store = createUpstashStore(CONFIG, { fetch: fetchMock });

    expect(await store.ping("heatwave", 7, IDS)).toEqual({
      total: 4,
      stations: { heatwave: 3, rearview: 1, neonpalms: 0 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example-db.upstash.io/pipeline");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer secret-token" });
    const commands = JSON.parse(String(init?.body));
    expect(commands).toEqual(upstashPipeline("heatwave", 7, IDS));
    // Budget: three commands per ping.
    expect(commands).toHaveLength(3);
  });

  it("returns null and warns without the token when the request fails", async () => {
    const warn = vi.fn();
    const failures: Array<() => Promise<Response>> = [
      async () => jsonResponse({ error: "WRONGPASS invalid password" }, 401),
      async () => jsonResponse([{ result: 1 }, { result: 1 }, { error: "ERR" }]),
      async () => new Response("<html>bad gateway</html>", { status: 200 }),
      async () => {
        throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
      },
    ];
    for (const failure of failures) {
      const store = createUpstashStore(CONFIG, { fetch: vi.fn<typeof fetch>(failure), warn });
      await expect(store.ping("heatwave", 7, IDS)).resolves.toBeNull();
    }
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      "[presence] Redis request failed: HTTP 401",
      "[presence] Redis request failed: unexpected response",
      "[presence] Redis request failed: SyntaxError",
      "[presence] Redis request failed: TypeError (ENOTFOUND)",
    ]);
    for (const [message] of warn.mock.calls) expect(message).not.toContain("secret-token");
  });

  it("gives up after 2.5 s", async () => {
    vi.useFakeTimers();
    const warn = vi.fn();
    const hangingFetch = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const store = createUpstashStore(CONFIG, { fetch: hangingFetch, warn });

    const pending = store.ping("heatwave", 7, IDS);
    await vi.advanceTimersByTimeAsync(2_499);
    expect(hangingFetch.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith("[presence] Redis request failed: timeout after 2500 ms");
  });

  it("warns at most once a minute while the database keeps failing", async () => {
    const clock = { now: 0 };
    const warn = vi.fn();
    const store = createUpstashStore(CONFIG, {
      fetch: vi.fn<typeof fetch>(async () => jsonResponse({ error: "down" }, 503)),
      now: () => clock.now,
      warn,
    });

    await store.ping("heatwave", 1, IDS);
    clock.now = 59_999;
    await store.ping("heatwave", 2, IDS);
    expect(warn).toHaveBeenCalledTimes(1);
    clock.now = 60_000;
    await store.ping("heatwave", 3, IDS);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
