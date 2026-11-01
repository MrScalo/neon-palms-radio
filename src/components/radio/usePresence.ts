import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { PresenceCounts, PresencePing } from "@/lib/presence/protocol";
import { stationNow, useClockSynced } from "@/lib/radio/clock";
import { parsePresenceResponse, pingJitterMs, planPing } from "./presence";

const PRESENCE_ENDPOINT = "/api/presence";
const REQUEST_TIMEOUT_MS = 10_000;

/** One ping; resolves to the counts, null when counting is off, undefined when it didn't work out. */
async function sendPing(station: string): Promise<PresenceCounts | null | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const ping: PresencePing = { station };
    const response = await fetch(PRESENCE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ping),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return undefined;
    return parsePresenceResponse(await response.json());
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Listener counts of the last complete window. While this tab is visible it counts itself in
 * with one anonymous ping per window of the station clock; hidden, it drops out. Null until the
 * first answer, and whenever the server has counting switched off.
 *
 * A station switch doesn't ping again in the same window, so the new station counts this tab
 * from the next window on; that way no tab is ever counted twice.
 */
export function usePresence(stationId: string): PresenceCounts | null {
  const synced = useClockSynced();
  const [counts, setCounts] = useState<PresenceCounts | null>(null);
  // Survives the effect re-running (Next hides and shows this page), so a window is never pinged twice.
  const lastPinged = useRef<number | null>(null);
  const ping = useEffectEvent(() => sendPing(stationId));

  useEffect(() => {
    // Windows follow the server's clock; before the first sync this tab could pick the wrong one.
    if (!synced) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let jitter = pingJitterMs(Math.random());
    let sent = 0;
    let shown = 0;

    function send() {
      const seq = ++sent;
      void ping().then((result) => {
        // A slow answer must not replace a newer one.
        if (!active || result === undefined || seq < shown) return;
        shown = seq;
        setCounts(result);
      });
    }

    function step() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      if (document.visibilityState !== "visible") return;
      const now = stationNow();
      let plan = planPing(now, lastPinged.current, jitter);
      if (plan.at <= now) {
        lastPinged.current = plan.window;
        jitter = pingJitterMs(Math.random());
        send();
        plan = planPing(now, lastPinged.current, jitter);
      }
      timer = setTimeout(step, plan.at - now);
    }

    document.addEventListener("visibilitychange", step);
    step();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", step);
      if (timer !== null) clearTimeout(timer);
    };
  }, [synced]);

  return counts;
}
