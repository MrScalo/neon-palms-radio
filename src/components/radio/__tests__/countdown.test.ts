import { describe, expect, it } from "vitest";
import { COUNTDOWN } from "@/config/countdown";
import { countdownTarget, describeCountdown, formatCountdown } from "../countdown";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatCountdown", () => {
  it("shows days, then hours, minutes and seconds", () => {
    expect(formatCountdown(17 * DAY + 4 * HOUR + 12 * MINUTE + 33 * SECOND)).toEqual({
      kind: "running",
      text: "17d 04:12:33",
    });
    expect(formatCountdown(100 * DAY)).toEqual({ kind: "running", text: "100d 00:00:00" });
  });

  it("drops the days under one day", () => {
    expect(formatCountdown(DAY)).toEqual({ kind: "running", text: "1d 00:00:00" });
    expect(formatCountdown(DAY - SECOND)).toEqual({ kind: "running", text: "23:59:59" });
    expect(formatCountdown(4 * HOUR + 12 * MINUTE + 33 * SECOND)).toEqual({ kind: "running", text: "04:12:33" });
  });

  it("rounds up to whole seconds, so it never reads 00:00:00 before the target", () => {
    expect(formatCountdown(DAY - 1)).toEqual({ kind: "running", text: "1d 00:00:00" });
    expect(formatCountdown(SECOND + 1)).toEqual({ kind: "running", text: "00:00:02" });
    expect(formatCountdown(1)).toEqual({ kind: "running", text: "00:00:01" });
  });

  it("is out now exactly at the target", () => {
    expect(formatCountdown(0)).toEqual({ kind: "out-now" });
    expect(formatCountdown(-0)).toEqual({ kind: "out-now" });
  });

  it("stays out now for the configured days, then goes away", () => {
    const window = COUNTDOWN.outNowDays * DAY;
    expect(COUNTDOWN.outNowDays).toBe(7);
    expect(formatCountdown(-1)).toEqual({ kind: "out-now" });
    expect(formatCountdown(-(window - 1))).toEqual({ kind: "out-now" });
    expect(formatCountdown(-window)).toEqual({ kind: "hidden" });
    expect(formatCountdown(-window - DAY)).toEqual({ kind: "hidden" });
  });

  it("hides on nonsense", () => {
    expect(formatCountdown(Number.NaN)).toEqual({ kind: "hidden" });
    expect(formatCountdown(Number.POSITIVE_INFINITY)).toEqual({ kind: "hidden" });
    expect(formatCountdown(Number.NEGATIVE_INFINITY)).toEqual({ kind: "hidden" });
  });
});

describe("describeCountdown", () => {
  it("spells the time left out to the minute", () => {
    expect(describeCountdown(17 * DAY + 4 * HOUR + 12 * MINUTE + 33 * SECOND)).toBe("17 days, 4 hours, 12 minutes");
    expect(describeCountdown(DAY + HOUR + MINUTE)).toBe("1 day, 1 hour, 1 minute");
  });

  it("leaves out empty units", () => {
    expect(describeCountdown(2 * DAY + 5 * MINUTE)).toBe("2 days, 5 minutes");
    expect(describeCountdown(3 * HOUR)).toBe("3 hours");
  });

  it("has words for the last minute", () => {
    expect(describeCountdown(59 * SECOND)).toBe("less than a minute");
    expect(describeCountdown(0)).toBe("less than a minute");
  });
});

describe("countdownTarget", () => {
  it("is local midnight at the start of the day", () => {
    const target = new Date(countdownTarget({ year: 2026, month: 11, day: 19 }));
    expect([target.getFullYear(), target.getMonth(), target.getDate()]).toEqual([2026, 10, 19]);
    expect([target.getHours(), target.getMinutes(), target.getSeconds(), target.getMilliseconds()]).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it("uses the configured day by default", () => {
    const { year, month, day } = COUNTDOWN.target;
    expect(countdownTarget()).toBe(new Date(year, month - 1, day).getTime());
  });
});
