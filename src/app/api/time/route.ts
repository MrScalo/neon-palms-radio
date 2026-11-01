import { connection } from "next/server";
import { SCHEDULE_FINGERPRINT } from "@/lib/radio/schedule";

/**
 * The network's reference clock. Every listener syncs to this so everyone on a station hears the same moment.
 * `schedule` fingerprints all stations' programmes, so pages loaded before a track list change
 * on any station learn that they compute an outdated programme.
 */
export async function GET(): Promise<Response> {
  // Under Cache Components a GET handler may be prerendered at build time; the time must be read per request.
  await connection();
  return Response.json({ now: Date.now(), schedule: SCHEDULE_FINGERPRINT }, { headers: { "Cache-Control": "no-store" } });
}
