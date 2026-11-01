import { describe, expect, it } from "vitest";
import { claimTitle } from "../useNowPlayingTitle";

describe("claimTitle", () => {
  it("sets the title and restores the previous one", () => {
    const doc = { title: "Home" };
    const undo = claimTitle(doc, "▶ Song");
    expect(doc.title).toBe("▶ Song");
    undo();
    expect(doc.title).toBe("Home");
  });

  it("restores correctly across track changes", () => {
    const doc = { title: "Home" };
    const undoFirst = claimTitle(doc, "▶ First");
    undoFirst();
    const undoSecond = claimTitle(doc, "▶ Second");
    expect(doc.title).toBe("▶ Second");
    undoSecond();
    expect(doc.title).toBe("Home");
  });

  it("leaves a title set by the next page alone", () => {
    const doc = { title: "Home" };
    const undo = claimTitle(doc, "▶ Song");
    doc.title = "The Rotation · Neon Palms FM";
    undo();
    expect(doc.title).toBe("The Rotation · Neon Palms FM");
  });
});
