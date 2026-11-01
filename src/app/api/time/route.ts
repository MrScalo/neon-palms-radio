import { connection } from "next/server";
import { SCHEDULE_FINGERPRINT } from "@/lib/radio/schedule";

/**
 * The station's reference clock. Every listener syncs to this so they all hear the same moment.
 * `schedule` tells pages loaded before a playlist change that they compute an outdated programme.
 */
export async function GET(): Promise<Response> {
  // Under Cache Components a GET handler may be prerendered at build time; the time must be read per request.
  await connection();
  return Response.json({ now: Date.now(), schedule: SCHEDULE_FINGERPRINT }, { headers: { "Cache-Control": "no-store" } });
}
