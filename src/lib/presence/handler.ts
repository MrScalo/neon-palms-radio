import { getStation, STATIONS } from "@/config/stations";
import { presenceWindow, type PresenceResponse } from "./protocol";
import type { PresenceStore } from "./store";

/** A ping is `{"station":"<id>"}`; anything near this size is not one. */
export const MAX_PING_BYTES = 1_024;

const STATION_IDS = STATIONS.map((station) => station.id);

/**
 * POST /api/presence: counts the ping in the current window and answers with the previous
 * window's counts. Only the station id is read from the body; other fields are ignored.
 */
export async function handlePresencePing(
  request: Request,
  store: PresenceStore | null,
  nowMs: number,
): Promise<Response> {
  // A body that breaks off mid-read is just an invalid ping.
  const body = await readBody(request, MAX_PING_BYTES).catch(() => "");
  if (body === null) return presenceResponse({ counts: null }, 413);
  const station = parsePingStation(body);
  if (station === null) return presenceResponse({ counts: null }, 400);
  if (store === null) return presenceResponse({ counts: null });

  const counts = await store.ping(station, presenceWindow(nowMs), STATION_IDS).catch(() => null);
  return presenceResponse({ counts });
}

/** The station id of a ping body, or null unless it is JSON naming a known station exactly. */
export function parsePingStation(body: string): string | null {
  let ping: unknown;
  try {
    ping = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof ping !== "object" || ping === null || Array.isArray(ping)) return null;
  const station: unknown = (ping as Record<string, unknown>).station;
  // getStation falls back to the default station; a ping must name one exactly.
  return typeof station === "string" && getStation(station).id === station ? station : null;
}

function presenceResponse(response: PresenceResponse, status = 200): Response {
  return Response.json(response, { status, headers: { "Cache-Control": "no-store" } });
}

/** The body as text, or null when it is larger than `maxBytes` (stops reading right there). */
async function readBody(request: Request, maxBytes: number): Promise<string | null> {
  if (Number(request.headers.get("content-length")) > maxBytes) return null;
  if (request.body === null) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
