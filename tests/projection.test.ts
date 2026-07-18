import { describe, it, expect } from "vitest";
import { businessDaysBetween, computeProjection } from "@/lib/projection-shared";

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
