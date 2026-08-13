import { describe, it, expect } from "vitest";
import { businessDaysBetween, computeProjection , scheduleVarianceDays } from "@/lib/projection-shared";

describe("businessDaysBetween", () => {
  it("counts Mon-Fri inclusive of both ends", () => {
    // Mon 2026-06-01 .. Fri 2026-06-05 => 5 working days
    expect(businessDaysBetween("2026-06-01", "2026-06-05")).toBe(5);
    // Fri 06-05 .. Mon 06-08 spans a weekend => Fri, Mon = 2
    expect(businessDaysBetween("2026-06-05", "2026-06-08")).toBe(2);
    // order independent
    expect(businessDaysBetween("2026-06-05", "2026-06-01")).toBe(5);
    // a single weekday
    expect(businessDaysBetween("2026-06-03", "2026-06-03")).toBe(1);
    // a single weekend day
    expect(businessDaysBetween("2026-06-06", "2026-06-06")).toBe(0);
  });
});

describe("computeProjection", () => {
  const base = {
    plannedStart: "2026-06-30",
    plannedEnd: "2026-08-08",
    today: "2026-07-10",
  };

  it("returns a null forecast with too little data", () => {
    const p = computeProjection({
      ...base,
      currentPercent: 5,
      history: [{ date: "2026-07-10", cumulativePercent: 5 }],
    });
    expect(p.ratePctPerDay).toBeNull();
    expect(p.projectedFinish).toBeNull();
    expect(p.daysVsDeadline).toBeNull();
  });

  it("projects a finish date from the recent slope", () => {
    const history = [
      { date: "2026-07-06", cumulativePercent: 30 },
      { date: "2026-07-07", cumulativePercent: 36 },
      { date: "2026-07-08", cumulativePercent: 42 },
      { date: "2026-07-09", cumulativePercent: 48 },
      { date: "2026-07-10", cumulativePercent: 54 },
    ];
    const p = computeProjection({ ...base, currentPercent: 54, history });
    // +6 percent per working day
    expect(p.ratePctPerDay).toBe(6);
    expect(p.projectedFinish).not.toBeNull();
    expect(p.projectedFinish! <= base.plannedEnd).toBe(true);
    expect(p.daysVsDeadline).not.toBeNull();
    expect(p.daysVsDeadline!).toBeGreaterThan(0);
  });

  it("computes working-day elapsed and total from planned dates", () => {
    const p = computeProjection({
      ...base,
      currentPercent: 54,
      history: [
        { date: "2026-07-09", cumulativePercent: 48 },
        { date: "2026-07-10", cumulativePercent: 54 },
      ],
    });
    // 2026-06-30 (Tue) .. 2026-07-10 (Fri) inclusive weekdays
    expect(p.workingDaysElapsed).toBe(9);
    // 2026-06-30 .. 2026-08-08 inclusive weekdays
    expect(p.workingDaysTotal).toBe(29);
  });

  it("degrades gracefully when planned dates are absent", () => {
    const p = computeProjection({
      today: "2026-07-10",
      currentPercent: 54,
      plannedStart: null,
      plannedEnd: null,
      history: [
        { date: "2026-07-09", cumulativePercent: 48 },
        { date: "2026-07-10", cumulativePercent: 54 },
      ],
    });
    expect(p.workingDaysElapsed).toBeNull();
    expect(p.workingDaysTotal).toBeNull();
    expect(p.daysVsDeadline).toBeNull();
    expect(p.projectedFinish).not.toBeNull();
  });
});

// The portfolio card's mark. It has to mean the same thing on a project that is
// running and on one delivered months ago, which cumulative progress cannot do:
// every finished project sits at 100 percent, so a progress line on a delivered
// job carries no information and a wall of them carries none loudly.
describe("scheduleVarianceDays", () => {
  const base = {
    status: "finished",
    plannedEnd: "2026-08-14", // a Friday
    lastReportedDate: null as string | null,
    projectedDaysVsDeadline: null as number | null,
  };

  it("counts a delivered project's buffer in working days", () => {
    // Finished Tuesday 11th against a Friday 14th deadline: Wed, Thu, Fri spare.
    expect(scheduleVarianceDays({ ...base, lastReportedDate: "2026-08-11" })).toBe(3);
  });

  it("counts an overrun as negative, skipping the weekend", () => {
    // Ran to Tuesday 18th against Friday 14th: Mon and Tue over, not four days.
    expect(scheduleVarianceDays({ ...base, lastReportedDate: "2026-08-18" })).toBe(-2);
  });

  it("is zero when it landed exactly on the promised day", () => {
    expect(scheduleVarianceDays({ ...base, lastReportedDate: "2026-08-14" })).toBe(0);
  });

  it("uses the projection while a project is still running", () => {
    expect(
      scheduleVarianceDays({
        ...base,
        status: "active",
        lastReportedDate: "2026-08-11",
        projectedDaysVsDeadline: -6,
      }),
    ).toBe(-6);
  });

  it("says nothing about a project with no deadline", () => {
    expect(scheduleVarianceDays({ ...base, plannedEnd: null, lastReportedDate: "2026-08-11" })).toBeNull();
  });

  it("says nothing about a delivered project that was never reported on", () => {
    expect(scheduleVarianceDays({ ...base, lastReportedDate: null })).toBeNull();
  });

  it("says nothing about a project that has not started, rather than guessing zero", () => {
    // A draft with no history has no pace to project from. Zero would read as
    // "exactly on time", which is a claim nobody has earned.
    expect(
      scheduleVarianceDays({ ...base, status: "draft", lastReportedDate: null, projectedDaysVsDeadline: null }),
    ).toBeNull();
  });
});
