import { describe, expect, it } from "vitest";
import { STATIONS } from "@/config/stations";
import { appendInput, hash53, matchTrigger, MAX_TRIGGER_LENGTH, triggerHash, type Extra } from "../triggers";

const FLARE: Extra = { kind: "flare" };
const table = new Map<number, Extra>([[triggerHash("ABC", "keys"), FLARE]]);

/** Every run of preset presses of exactly `length` presses on three presets. */
function presetRuns(length: number): string[] {
  if (length === 0) return [""];
  return presetRuns(length - 1).flatMap((run) => ["1", "2", "3"].map((key) => run + key));
}

describe("hash53", () => {
  it("is deterministic and depends on text and seed", () => {
    expect(hash53("neon", 7)).toBe(hash53("neon", 7));
    expect(hash53("neon", 7)).not.toBe(hash53("neon", 8));
    expect(hash53("neon", 7)).not.toBe(hash53("noen", 7));
    expect(Number.isSafeInteger(hash53("neon"))).toBe(true);
  });
});

describe("matchTrigger", () => {
  it("finds a trigger at the end of the input", () => {
    expect(matchTrigger("ABC", "keys", table)).toEqual(FLARE);
    expect(matchTrigger("XYZABC", "keys", table)).toEqual(FLARE);
  });

  it("needs the trigger to be the latest input", () => {
    expect(matchTrigger("ABCX", "keys", table)).toBeNull();
    expect(matchTrigger("AB", "keys", table)).toBeNull();
  });

  it("keeps the channels apart", () => {
    expect(matchTrigger("ABC", "presets", table)).toBeNull();
  });

  it("never fires on ordinary preset use", () => {
    for (let length = 1; length <= 6; length++) {
      for (const run of presetRuns(length)) expect(matchTrigger(run, "presets")).toBeNull();
    }
  });

  it("never fires on the station names", () => {
    const typed = STATIONS.map((station) => station.name.replace(/\W/g, "").toUpperCase()).join("");
    for (let end = 1; end <= typed.length; end++) expect(matchTrigger(typed.slice(0, end), "keys")).toBeNull();
  });
});

describe("appendInput", () => {
  it("keeps only as much input as the longest trigger", () => {
    const long = appendInput("A".repeat(MAX_TRIGGER_LENGTH), "B");
    expect(long).toHaveLength(MAX_TRIGGER_LENGTH);
    expect(long.endsWith("AB")).toBe(true);
    expect(appendInput("", "1")).toBe("1");
  });
});
