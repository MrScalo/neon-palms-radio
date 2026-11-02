import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import { prefersReducedMotion } from "../useTuning";
import { appendInput, matchTrigger, PRESET_RUN_GAP_MS, type Extra } from "./triggers";
import { adjustStars, NOT_WANTED, recordSwitch, viewWanted, type WantedState, type WantedView } from "./wanted";

/** Confirmation in the status line, under the player. */
export type Notice = { seq: number; text: string };

/** Money counting up from `from` to `to` next to the listener count. */
export type MoneyShow = { seq: number; from: number; to: number };

const NOTICE_TEXT = "Cheat activated";
const NOTICE_MS = 3_000;
const MONEY_MS = 5_000;
const FLARE_MS = 1_400;
const TIMELAPSE_MS = 15_000;
const TIMELAPSE_RATE = 6;

function typingInField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select") !== null);
}

/** Running CSS animations of the scenery and the ticker. The set, and the player in it, are left alone. */
function sceneryAnimations(stage: Element): Animation[] {
  return document.getAnimations().filter((animation) => {
    const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
    return target !== null && stage.contains(target) && target.closest(".np-chassis") === null;
  });
}

/**
 * The hidden extras (see triggers.ts). Pink, flare and timelapse act on the whole page
 * (.np-stage around `rootRef`); stars, money and the notice are returned for the radio to draw.
 */
export function useExtras(rootRef: RefObject<HTMLElement | null>) {
  const wantedRef = useRef<WantedState>(NOT_WANTED);
  const [wanted, setWanted] = useState<WantedView>(() => viewWanted(NOT_WANTED, 0));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [money, setMoney] = useState<MoneyShow | null>(null);
  const [pink, setPink] = useState(false);
  const keys = useRef("");
  const presetRun = useRef({ input: "", at: Number.NEGATIVE_INFINITY });
  const moneyTotal = useRef(0);
  const flareTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timelapseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stage = () => rootRef.current?.closest(".np-stage") ?? null;

  function updateWanted(change: (state: WantedState, now: number) => WantedState) {
    const now = performance.now();
    wantedRef.current = change(wantedRef.current, now);
    setWanted(viewWanted(wantedRef.current, now));
  }

  function flare() {
    const element = stage();
    if (element === null) return;
    // Off and on again, with a layout read in between, so a second flare restarts the animation.
    element.removeAttribute("data-flare");
    void element.getBoundingClientRect();
    element.setAttribute("data-flare", "");
    clearTimeout(flareTimer.current);
    flareTimer.current = setTimeout(() => element.removeAttribute("data-flare"), FLARE_MS);
  }

  function timelapse() {
    const element = stage();
    // Under reduced motion nothing on the page moves, so there is nothing to speed up.
    if (element === null || prefersReducedMotion()) return;
    for (const animation of sceneryAnimations(element)) animation.updatePlaybackRate(TIMELAPSE_RATE);
    clearTimeout(timelapseTimer.current);
    timelapseTimer.current = setTimeout(() => {
      for (const animation of sceneryAnimations(element)) animation.updatePlaybackRate(1);
    }, TIMELAPSE_MS);
  }

  function apply(extra: Extra) {
    switch (extra.kind) {
      case "pink":
        setPink((on) => !on);
        break;
      case "wanted":
        updateWanted((state, now) => adjustStars(state, extra.delta, now));
        break;
      case "money": {
        const from = moneyTotal.current;
        moneyTotal.current += extra.amount;
        setMoney((previous) => ({ seq: (previous?.seq ?? 0) + 1, from, to: moneyTotal.current }));
        break;
      }
      case "flare":
        flare();
        break;
      case "timelapse":
        timelapse();
        break;
    }
    setNotice((previous) => ({ seq: (previous?.seq ?? 0) + 1, text: NOTICE_TEXT }));
  }

  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (!/^[a-z]$/i.test(event.key) || typingInField(event.target)) return;
    keys.current = appendInput(keys.current, event.key.toUpperCase());
    const extra = matchTrigger(keys.current, "keys");
    if (extra === null) return;
    keys.current = "";
    apply(extra);
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // Flashing, then gone: each stage ends on its own.
  useEffect(() => {
    if (wanted.changesAt === null) return;
    const timer = setTimeout(
      () => setWanted(viewWanted(wantedRef.current, performance.now())),
      Math.max(0, wanted.changesAt - performance.now()),
    );
    return () => clearTimeout(timer);
  }, [wanted]);

  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (money === null) return;
    const timer = setTimeout(() => setMoney(null), MONEY_MS);
    return () => clearTimeout(timer);
  }, [money]);

  useEffect(() => {
    const element = rootRef.current?.closest(".np-stage");
    if (!pink || !element) return;
    element.setAttribute("data-pink", "");
    return () => element.removeAttribute("data-pink");
  }, [pink, rootRef]);

  useEffect(
    () => () => {
      clearTimeout(flareTimer.current);
      clearTimeout(timelapseTimer.current);
    },
    [],
  );

  return {
    wanted,
    notice,
    money,
    /** Call for every station switch the listener makes. */
    onSwitch() {
      updateWanted(recordSwitch);
    },
    /** Call for every preset press (0-based index), including the selected station's own. */
    onPresetPress(index: number) {
      const now = performance.now();
      const run = presetRun.current;
      const input = appendInput(now - run.at > PRESET_RUN_GAP_MS ? "" : run.input, String(index + 1));
      const extra = matchTrigger(input, "presets");
      presetRun.current = { input: extra === null ? input : "", at: now };
      if (extra !== null) apply(extra);
    },
  };
}
