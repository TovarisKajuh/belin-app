import { describe, it, expect } from "vitest";
import {
  ddmm,
  daysSinceEpoch,
  smoothPath,
  areaPath,
  buildProjectionChart,
  type Pt,
} from "@/lib/dashboard-shared";

describe("ddmm", () => {
  it("formats an ISO date as day.month", () => {
    expect(ddmm("2026-07-19")).toBe("19.07");
  });
  it("returns null for missing or short input", () => {
    expect(ddmm(null)).toBeNull();
    expect(ddmm("2026-07")).toBeNull();
  });
});

describe("daysSinceEpoch", () => {
  it("counts whole days and is timezone stable", () => {
    expect(daysSinceEpoch("1970-01-01")).toBe(0);
    expect(daysSinceEpoch("1970-01-02")).toBe(1);
    expect(daysSinceEpoch("2026-07-20") - daysSinceEpoch("2026-07-19")).toBe(1);
  });
});

describe("smoothPath", () => {
  it("handles empty and single-point input", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 1, y: 2 }])).toBe("M 1,2");
  });

  it("passes exactly through every data point", () => {
    const pts: Pt[] = [
      { x: 0, y: 100 },
      { x: 50, y: 60 },
      { x: 100, y: 20 },
    ];
    const d = smoothPath(pts);
    // Every segment ends on the real point, so each one appears as a curve end.
    expect(d.startsWith("M 0,100")).toBe(true);
    expect(d).toContain("50,60");
    expect(d.endsWith("100,20")).toBe(true);
  });

  it("never lets a control point overshoot its segment, so the curve cannot imply unreported progress", () => {
    // A flat day followed by a jump: naive Catmull-Rom would dip below the flat run.
    const pts: Pt[] = [
      { x: 0, y: 100 },
      { x: 25, y: 100 },
      { x: 50, y: 40 },
      { x: 75, y: 38 },
    ];
    const d = smoothPath(pts);
    const ys = [...d.matchAll(/[-\d.]+,([-\d.]+)/g)].map((m) => Number(m[1]));
    // y is inverted in SVG: smaller y means more progress. Nothing may sit
    // above the best reported point (38) or below the worst (100).
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(38);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
  });
});

describe("areaPath", () => {
  it("closes the line down to the baseline", () => {
    const pts: Pt[] = [
      { x: 0, y: 50 },
      { x: 10, y: 20 },
    ];
    const a = areaPath(smoothPath(pts), pts, 188);
    expect(a).toContain("L 10,188");
    expect(a).toContain("L 0,188");
    expect(a.endsWith("Z")).toBe(true);
  });
});

describe("buildProjectionChart", () => {
  const base = {
    today: "2026-07-10",
    projectedFinish: "2026-07-30",
    plannedEnd: "2026-08-08",
    width: 800,
    yTop: 12,
    yBottom: 188,
  };

  it("returns an empty chart when there is no history", () => {
    const c = buildProjectionChart({ ...base, history: [] });
    expect(c.actual).toEqual([]);
    expect(c.projection).toBeNull();
    expect(c.buffer).toBeNull();
  });

  it("maps history to a left-to-right, rising curve inside the canvas", () => {
    const c = buildProjectionChart({
      ...base,
      history: [
        { date: "2026-07-06", cumulativePercent: 30 },
        { date: "2026-07-08", cumulativePercent: 42 },
        { date: "2026-07-10", cumulativePercent: 54 },
      ],
    });
    expect(c.actual).toHaveLength(3);
    // x increases with time.
    expect(c.actual[0].x).toBeLessThan(c.actual[1].x);
    expect(c.actual[1].x).toBeLessThan(c.actual[2].x);
    // y decreases as progress rises (SVG y grows downward).
    expect(c.actual[0].y).toBeGreaterThan(c.actual[2].y);
    // Everything stays inside the drawable band.
    for (const p of c.actual) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(base.width);
      expect(p.y).toBeLessThanOrEqual(base.yBottom);
      expect(p.y).toBeGreaterThanOrEqual(base.yTop);
    }
  });

  it("draws the forecast from the last real point up to 100 percent", () => {
    const c = buildProjectionChart({
      ...base,
      history: [
        { date: "2026-07-06", cumulativePercent: 30 },
        { date: "2026-07-10", cumulativePercent: 54 },
      ],
    });
    expect(c.projection).not.toBeNull();
    expect(c.projection![0]).toEqual(c.actual[c.actual.length - 1]);
    expect(c.projection![1].y).toBe(base.yTop); // 100 percent sits at the top
    expect(c.projection![1].x).toBe(c.finishX);
  });

  it("shows a buffer band only when the forecast lands before the deadline", () => {
    const history = [
      { date: "2026-07-06", cumulativePercent: 30 },
      { date: "2026-07-10", cumulativePercent: 54 },
    ];
    const ahead = buildProjectionChart({ ...base, history });
    expect(ahead.buffer).not.toBeNull();
    expect(ahead.buffer!.width).toBeGreaterThan(0);

    const late = buildProjectionChart({
      ...base,
      history,
      projectedFinish: "2026-08-20", // past the 08.08 deadline
    });
    expect(late.buffer).toBeNull();
  });

  it("does not divide by zero when everything happens on one day", () => {
    const c = buildProjectionChart({
      ...base,
      today: "2026-07-06",
      projectedFinish: null,
      plannedEnd: null,
      history: [{ date: "2026-07-06", cumulativePercent: 10 }],
    });
    expect(Number.isFinite(c.actual[0].x)).toBe(true);
    expect(Number.isFinite(c.todayX!)).toBe(true);
  });
});
