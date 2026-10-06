import { describe, expect, it } from "vitest";
import {
  isSiteDay,
  siteDaysBefore,
  lastSiteDayBefore,
  nthSiteDayBefore,
  siteDayOnOrAfter,
  todayInLjubljana,
  isoPlusDays,
} from "@/lib/demo/calendar";

describe("demo site calendar", () => {
  it("works Monday to Friday and never on a Slovenian holiday", () => {
    expect(isSiteDay("2026-10-05")).toBe(true); // Monday
    expect(isSiteDay("2026-10-03")).toBe(false); // Saturday
    expect(isSiteDay("2026-10-04")).toBe(false); // Sunday
    expect(isSiteDay("2026-12-25")).toBe(false); // Friday, Christmas
  });

  it("lists the nine site days before the meeting, oldest first", () => {
    expect(siteDaysBefore("2026-10-06", 9)).toEqual([
      "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-28", "2026-09-29",
      "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-05",
    ]);
  });

  it("finds the last site day before a date across a weekend", () => {
    expect(lastSiteDayBefore("2026-10-06")).toBe("2026-10-05");
    expect(lastSiteDayBefore("2026-10-05")).toBe("2026-10-02");
  });

  it("counts site days backwards", () => {
    expect(nthSiteDayBefore("2026-09-23", 1)).toBe("2026-09-22");
    expect(nthSiteDayBefore("2026-09-23", 3)).toBe("2026-09-18");
  });

  it("moves a start date off weekends and holidays", () => {
    expect(siteDayOnOrAfter("2026-10-06")).toBe("2026-10-06");
    expect(siteDayOnOrAfter("2026-10-10")).toBe("2026-10-12");
    expect(siteDayOnOrAfter("2026-12-25")).toBe("2026-12-28");
  });

  it("reads today in Ljubljana, not in UTC", () => {
    expect(todayInLjubljana(new Date("2026-10-05T22:30:00Z"))).toBe("2026-10-06");
    expect(isoPlusDays("2026-10-06", -7)).toBe("2026-09-29");
  });
});
