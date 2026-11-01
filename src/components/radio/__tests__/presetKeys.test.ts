import { describe, expect, it } from "vitest";
import { presetIndexForKey } from "../presetKeys";

describe("presetIndexForKey", () => {
  it("moves with the arrow keys and wraps around", () => {
    expect(presetIndexForKey("ArrowRight", 0, 3)).toBe(1);
    expect(presetIndexForKey("ArrowDown", 2, 3)).toBe(0);
    expect(presetIndexForKey("ArrowLeft", 0, 3)).toBe(2);
    expect(presetIndexForKey("ArrowUp", 1, 3)).toBe(0);
  });

  it("jumps to the ends with Home and End", () => {
    expect(presetIndexForKey("Home", 2, 3)).toBe(0);
    expect(presetIndexForKey("End", 0, 3)).toBe(2);
  });

  it("picks a preset by its number", () => {
    expect(presetIndexForKey("1", 2, 3)).toBe(0);
    expect(presetIndexForKey("3", 0, 3)).toBe(2);
    expect(presetIndexForKey("4", 0, 3)).toBeNull();
    expect(presetIndexForKey("0", 0, 3)).toBeNull();
  });

  it("ignores other keys and empty groups", () => {
    expect(presetIndexForKey("Enter", 0, 3)).toBeNull();
    expect(presetIndexForKey("a", 0, 3)).toBeNull();
    expect(presetIndexForKey("ArrowRight", 0, 0)).toBeNull();
  });

  it("recovers from an unknown starting point", () => {
    expect(presetIndexForKey("ArrowRight", -1, 3)).toBe(1);
  });
});
