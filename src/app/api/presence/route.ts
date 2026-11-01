import { connection } from "next/server";
import { getPresenceStore } from "@/lib/presence/config";
import { handlePresencePing } from "@/lib/presence/handler";

/**
 * Listener count without identifiers: each open, visible tab pings once per window with its station;
 * the answer is the previous window's count per station. POST only, so any other method gets a 405.
 */
export async function POST(request: Request): Promise<Response> {
  // The counting window comes from the server clock, which must be read per request.
  await connection();
  return handlePresencePing(request, getPresenceStore(), Date.now());
}
