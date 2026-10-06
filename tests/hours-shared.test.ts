import { describe, expect, it } from "vitest";
import {
  addWorkingDays,
  deadlineTimestamp,
  DECISION_WORKING_DAYS,
  effectiveStatus,
  HOLIDAYS,
  subtractWorkingDays,
  isWorkingDay,
  workingDaysLeft,
} from "@/lib/hours-shared";

// The clock behind Regiestunden. If it is wrong, an hour sheet is either
// approved that should not have been, or a subcontractor is told their claim
// lapsed a day before it did. Every pin below was computed against a real
// calendar before it was written, not derived from the implementation.

describe("addWorkingDays", () => {
  // Friday 14.08.2026. Saturday 15.08 is Marijino vnebovzetje in Slovenia and
  // NOT a German federal holiday, so the same submission produces a different
  // deadline on either side of the border. This pair is the test that proves
  // the country parameter is actually used rather than decorative.
  it("counts Saturdays as working days, and skips the country's own holidays", () => {
    expect(addWorkingDays("2026-08-14", 6, "si")).toBe("2026-08-22");
    expect(addWorkingDays("2026-08-14", 6, "de")).toBe("2026-08-21");
  });

  it("never counts a Sunday", () => {
    // Saturday 08.08 plus one working day is Monday 10.08, not Sunday 09.08.
    expect(addWorkingDays("2026-08-08", 1, "de")).toBe("2026-08-10");
  });

  it("excludes the start day itself", () => {
    expect(addWorkingDays("2026-08-10", 1, "de")).toBe("2026-08-11");
  });

  // The year boundary. Without the 2027 holidays loaded, 01.01 would count as
  // an ordinary Friday and every December claim would expire a day early.
  it("crosses the year boundary using next year's holidays", () => {
    expect(addWorkingDays("2026-12-23", 6, "de")).toBe("2027-01-02");
  });

  it("returns the start day when asked for zero days", () => {
    expect(addWorkingDays("2026-08-14", 0, "de")).toBe("2026-08-14");
  });

  it("uses six working days as the decision period", () => {
    expect(DECISION_WORKING_DAYS).toBe(6);
  });
});

describe("HOLIDAYS", () => {
  it("covers both 2026 and 2027 for every country", () => {
    for (const country of ["si", "de", "at"] as const) {
      expect(HOLIDAYS[country].some((day) => day.startsWith("2026"))).toBe(true);
      expect(HOLIDAYS[country].some((day) => day.startsWith("2027"))).toBe(true);
    }
  });

  it("carries the movable feasts at their real dates", () => {
    // Easter Sunday 2026 is 05.04, so Easter Monday is the 6th; 2027 is 28.03.
    expect(HOLIDAYS.si).toContain("2026-04-06");
    expect(HOLIDAYS.si).toContain("2027-03-29");
    // Ascension and Whit Monday, which German and Austrian deadlines hit.
    expect(HOLIDAYS.de).toContain("2026-05-14");
    expect(HOLIDAYS.de).toContain("2026-05-25");
    expect(HOLIDAYS.at).toContain("2026-06-04");
  });

  it("keeps every entry a plain ISO date", () => {
    for (const country of ["si", "de", "at"] as const) {
      for (const day of HOLIDAYS[country]) {
        expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

describe("deadlineTimestamp", () => {
  // The deadline is the end of its day AT THE SITE. Slovenia is UTC+2 in
  // August, so the last instant of the 22nd there is 21:59:59Z on the 22nd.
  // Storing 23:59:59Z instead would put the real deadline at 01:59 on the
  // 23rd local, and would print the wrong DATE on every screen.
  it("ends the day in the site's own timezone, not in UTC", () => {
    expect(deadlineTimestamp("2026-08-22", "si")).toBe("2026-08-22T21:59:59.000Z");
    expect(deadlineTimestamp("2026-08-22", "de")).toBe("2026-08-22T21:59:59.000Z");
  });

  // Winter: the same zones are UTC+1, so the instant moves an hour later.
  it("follows daylight saving", () => {
    expect(deadlineTimestamp("2026-12-22", "si")).toBe("2026-12-22T22:59:59.000Z");
  });
});

describe("effectiveStatus", () => {
  const now = new Date("2026-08-20T09:00:00.000Z");

  it("reads a submitted sheet past its deadline as deemed approved", () => {
    expect(
      effectiveStatus({ status: "submitted", deadline_at: "2026-08-19T23:59:59.000Z" }, now),
    ).toBe("deemed_approved");
  });

  it("leaves a submitted sheet inside its deadline alone", () => {
    expect(
      effectiveStatus({ status: "submitted", deadline_at: "2026-08-22T23:59:59.000Z" }, now),
    ).toBe("submitted");
  });

  // Silence is what approves a sheet; an explicit decision is not undone by
  // the clock running out afterwards.
  it("never rewrites a decision that was actually made", () => {
    expect(effectiveStatus({ status: "approved", deadline_at: "2026-08-01T23:59:59.000Z" }, now)).toBe(
      "approved",
    );
    expect(effectiveStatus({ status: "rejected", deadline_at: "2026-08-01T23:59:59.000Z" }, now)).toBe(
      "rejected",
    );
  });

  it("leaves a draft alone, deadline or not", () => {
    expect(effectiveStatus({ status: "draft", deadline_at: null }, now)).toBe("draft");
    expect(effectiveStatus({ status: "submitted", deadline_at: null }, now)).toBe("submitted");
  });
});

describe("workingDaysLeft", () => {
  it("is zero on the deadline day itself", () => {
    expect(workingDaysLeft("2026-08-20", new Date("2026-08-20T09:00:00.000Z"), "de")).toBe(0);
  });

  it("counts the working days remaining", () => {
    // Mon 17.08 to Thu 20.08 is three working days away.
    expect(workingDaysLeft("2026-08-20", new Date("2026-08-17T09:00:00.000Z"), "de")).toBe(3);
  });

  it("skips Sundays and holidays in the countdown", () => {
    // Fri 14.08 to Mon 17.08: Saturday counts in Germany, Sunday never does.
    expect(workingDaysLeft("2026-08-17", new Date("2026-08-14T09:00:00.000Z"), "de")).toBe(2);
    // In Slovenia the 15th is a holiday, so the same span is one day shorter.
    expect(workingDaysLeft("2026-08-17", new Date("2026-08-14T09:00:00.000Z"), "si")).toBe(1);
  });

  it("clamps to zero once the deadline has passed", () => {
    expect(workingDaysLeft("2026-08-10", new Date("2026-08-20T09:00:00.000Z"), "de")).toBe(0);
  });
});

describe("subtractWorkingDays", () => {
  it("is six Werktage before the Thursday deadline: the Thursday before", () => {
    expect(subtractWorkingDays("2026-10-08", 6, "si")).toBe("2026-10-01");
  });

  it("skips Sundays and holidays on the way back", () => {
    // 01.11 is a Sunday holiday and 31.10 a Saturday holiday in Slovenia.
    expect(subtractWorkingDays("2026-11-02", 6, "si")).toBe("2026-10-24");
  });

  it("is the exact inverse of addWorkingDays on every working day of 2026 and 2027", () => {
    const failures: string[] = [];
    for (let t = Date.parse("2026-01-03T00:00:00Z"); t < Date.parse("2027-12-01T00:00:00Z"); t += 86400000) {
      const day = new Date(t).toISOString().slice(0, 10);
      if (!isWorkingDay(day, "si")) continue;
      if (addWorkingDays(subtractWorkingDays(day, 6, "si"), 6, "si") !== day) failures.push(day);
    }
    expect(failures).toEqual([]);
  });
});
