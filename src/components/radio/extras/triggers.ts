import { WANTED } from "./wanted";

/**
 * Hidden extras. Words typed anywhere on the page, or quick runs on the preset keys, set them off.
 * The triggers are stored only as hashes, so reading the source doesn't give them away.
 */
export type Extra =
  | { kind: "pink" }
  | { kind: "wanted"; delta: number }
  | { kind: "money"; amount: number }
  | { kind: "flare" }
  | { kind: "timelapse" };

/** Where a trigger is entered: letters on the keyboard, or preset numbers (1-based) pressed in a row. */
export type TriggerChannel = "keys" | "presets";

/** No trigger is longer than this; older input is dropped. */
export const MAX_TRIGGER_LENGTH = 24;

/** Longest pause between two preset presses that still counts as one run. */
export const PRESET_RUN_GAP_MS = 1500;

const SEED = 1986;

const PREFIX: Record<TriggerChannel, string> = { keys: "k:", presets: "p:" };

/** cyrb53: a small, fast 53-bit string hash. Not cryptographic; it only keeps the triggers out of plain sight. */
export function hash53(text: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Hash of `trigger` as it is stored in a table. */
export function triggerHash(trigger: string, channel: TriggerChannel): number {
  return hash53(PREFIX[channel] + trigger, SEED);
}

const CLEAR = { kind: "wanted", delta: -WANTED.maxStars } as const;

export const TRIGGERS: ReadonlyMap<number, Extra> = new Map<number, Extra>([
  [17330800988976, { kind: "pink" }],
  [7112831685345960, CLEAR],
  [6214687085558021, CLEAR],
  [3854929130904693, { kind: "wanted", delta: -1 }],
  [1556087639224008, { kind: "wanted", delta: 2 }],
  [7422780684664022, { kind: "wanted", delta: 1 }],
  [4638432519008440, { kind: "money", amount: 250_000 }],
  [4502686177225787, { kind: "flare" }],
  [8541751089761126, { kind: "timelapse" }],
  [7807553458136421, { kind: "pink" }],
  [2576631970270124, CLEAR],
  [7251761607536745, { kind: "money", amount: 250_000 }],
  [128372361401110, { kind: "flare" }],
  [7005226372195383, { kind: "timelapse" }],
]);

/** The extra whose trigger `input` ends with, shortest first; null if there is none. */
export function matchTrigger(
  input: string,
  channel: TriggerChannel,
  table: ReadonlyMap<number, Extra> = TRIGGERS,
): Extra | null {
  const longest = Math.min(input.length, MAX_TRIGGER_LENGTH);
  for (let length = 1; length <= longest; length++) {
    const extra = table.get(triggerHash(input.slice(-length), channel));
    if (extra !== undefined) return extra;
  }
  return null;
}

/** `input` with `next` appended, keeping only what a trigger could still end with. */
export function appendInput(input: string, next: string): string {
  return (input + next).slice(-MAX_TRIGGER_LENGTH);
}
