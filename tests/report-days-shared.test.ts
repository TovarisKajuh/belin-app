import { describe, expect, it } from "vitest";
import { buildDayReports, diaryTitleKey } from "@/lib/report-days-shared";

// The numbering rule behind the Bautagesbericht. A construction diary is read
// as a sequence, and a gap in the numbers is what somebody points at in a
// dispute to argue a day was removed. So the numbers are positions in the
// sequence of days that HAVE content, never calendar arithmetic.

describe("buildDayReports", () => {
  it("numbers the days that carry content, ascending, with no gaps", () => {
    const days = buildDayReports(["2026-08-03", "2026-08-05"], []);
    expect(days).toEqual([
      { dateIso: "2026-08-03", reportNo: 1 },
      { dateIso: "2026-08-05", reportNo: 2 },
    ]);
  });

  // A weekend, a rained-off week, a holiday: the calendar gap is real and the
  // numbering does not care. Day 3 follows day 2 even if a fortnight passed.
  it("does not skip a number across a calendar gap", () => {
    const days = buildDayReports(["2026-08-03", "2026-08-21"], []);
    expect(days.map((day) => day.reportNo)).toEqual([1, 2]);
  });

  // An incident-only day is still a day on site: rain that stopped the work is
  // exactly the day somebody will want documented later.
  it("includes days that carry only an incident", () => {
    const days = buildDayReports(["2026-08-03"], ["2026-08-04"]);
    expect(days).toEqual([
      { dateIso: "2026-08-03", reportNo: 1 },
      { dateIso: "2026-08-04", reportNo: 2 },
    ]);
  });

  it("counts a date once when it carries both an entry and an incident", () => {
    const days = buildDayReports(["2026-08-03"], ["2026-08-03"]);
    expect(days).toEqual([{ dateIso: "2026-08-03", reportNo: 1 }]);
  });

  it("sorts dates that arrive in any order, and ignores duplicates", () => {
    const days = buildDayReports(
      ["2026-08-05", "2026-08-03", "2026-08-05"],
      ["2026-08-04"],
    );
    expect(days.map((day) => day.dateIso)).toEqual(["2026-08-03", "2026-08-04", "2026-08-05"]);
    expect(days.map((day) => day.reportNo)).toEqual([1, 2, 3]);
  });

  it("is empty for a project with nothing logged", () => {
    expect(buildDayReports([], [])).toEqual([]);
  });
});

describe("diaryTitleKey", () => {
  // Slovenia positioning, decided 2026-07-20 after legal research: our diary is
  // contractual documentation between two companies, never the statutory
  // gradbeni dnevnik, which needs handwritten signatures on duplicate paper.
  // The title follows the SITE country, not the reader's language.
  it("titles Slovenian projects as a subcontractor's daily report", () => {
    expect(diaryTitleKey("si")).toBe("final.diaryTitleSi");
  });

  it("titles German and Austrian projects as a Bautagesbericht", () => {
    expect(diaryTitleKey("de")).toBe("final.diaryTitleDeAt");
    expect(diaryTitleKey("at")).toBe("final.diaryTitleDeAt");
  });

  it("falls back to the Slovenian positioning when the country is unknown", () => {
    // The safer default: claiming less than a statutory diary can never be the
    // error that matters.
    expect(diaryTitleKey(null)).toBe("final.diaryTitleSi");
    expect(diaryTitleKey("")).toBe("final.diaryTitleSi");
  });
});
