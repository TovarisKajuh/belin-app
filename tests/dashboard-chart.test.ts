import { describe, it, expect } from "vitest";
import {
  ddmm,
  daysSinceEpoch,
  monotonePath,
  areaPath,
  buildProjectionChart,
  nearestIndex,
  type Pt,
} from "@/lib/dashboard-shared";

// Walk a path's cubic segments and sample them, so we can assert on the curve
// that actually renders rather than only on the points we fed in.
function sampleCurve(d: string, steps = 24): Pt[] {
  const nums = (s: string) => s.trim().split(/[\s,]+/).map(Number);
  const start = d.match(/^M\s*([-\d.]+),([-\d.]+)/);
  if (!start) return [];
  let cur: Pt = { x: Number(start[1]), y: Number(start[2]) };
  const out: Pt[] = [cur];
  for (const seg of d.matchAll(/C\s*([-\d.,\s]+)/g)) {
    const [c1x, c1y, c2x, c2y, ex, ey] = nums(seg[1]);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      out.push({
        x: u * u * u * cur.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex,
        y: u * u * u * cur.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey,
      });
    }
    cur = { x: ex, y: ey };
  }
  return out;
}

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

describe("monotonePath", () => {
  it("handles empty, single and two-point input", () => {
    expect(monotonePath([])).toBe("");
    expect(monotonePath([{ x: 1, y: 2 }])).toBe("M 1,2");
    expect(
      monotonePath([
        { x: 0, y: 10 },
        { x: 5, y: 4 },
      ])
    ).toBe("M 0,10 L 5,4");
  });

  it("passes exactly through every data point", () => {
    const pts: Pt[] = [
      { x: 0, y: 100 },
      { x: 50, y: 60 },
      { x: 100, y: 20 },
    ];
    const d = monotonePath(pts);
    expect(d.startsWith("M 0,100")).toBe(true);
    expect(d).toContain("50,60");
    expect(d.endsWith("100,20")).toBe(true);
  });

  it("never overshoots the reported values anywhere along the rendered curve", () => {
    // A flat run then a jump. This is the shape that makes naive splines dip.
    const pts: Pt[] = [
      { x: 0, y: 100 },
      { x: 25, y: 100 },
      { x: 50, y: 40 },
      { x: 75, y: 38 },
    ];
    const ys = sampleCurve(monotonePath(pts)).map((p) => p.y);
    // SVG y is inverted: smaller y means more progress. The curve may never
    // rise above the best reported value or sag below the worst.
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(38 - 1e-6);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100 + 1e-6);
  });

  it("stays monotone across the whole curve for ever-rising progress", () => {
    const pts: Pt[] = [
      { x: 0, y: 180 },
      { x: 40, y: 176 },
      { x: 80, y: 120 },
      { x: 120, y: 60 },
      { x: 160, y: 56 },
      { x: 200, y: 20 },
    ];
    const sampled = sampleCurve(monotonePath(pts));
    for (let i = 1; i < sampled.length; i++) {
      // Cumulative progress never goes backwards, so y never increases.
      expect(sampled[i].y).toBeLessThanOrEqual(sampled[i - 1].y + 1e-6);
    }
  });

  it("keeps a flat stretch perfectly flat", () => {
    const pts: Pt[] = [
      { x: 0, y: 100 },
      { x: 30, y: 50 },
      { x: 60, y: 50 },
      { x: 90, y: 50 },
    ];
    const tail = sampleCurve(monotonePath(pts)).filter((p) => p.x >= 30);
    for (const p of tail) expect(Math.abs(p.y - 50)).toBeLessThan(1e-6);
  });
});

describe("nearestIndex", () => {
  const xs = [0, 10, 25, 60, 100];
  it("handles empty and single-element arrays", () => {
    expect(nearestIndex([], 5)).toBe(-1);
    expect(nearestIndex([7], 100)).toBe(0);
  });
  it("clamps below and above the range", () => {
    expect(nearestIndex(xs, -50)).toBe(0);
    expect(nearestIndex(xs, 500)).toBe(4);
  });
  it("finds exact hits and nearest neighbours", () => {
    expect(nearestIndex(xs, 25)).toBe(2);
    expect(nearestIndex(xs, 16)).toBe(1); // 6 from 10, 9 from 25
    expect(nearestIndex(xs, 18)).toBe(2); // 8 from 10, 7 from 25
    expect(nearestIndex(xs, 17.5)).toBe(1); // tie goes to the left
  });
  it("works on typed arrays, which is how the scrub calls it", () => {
    const t = new Float32Array([0, 50, 100]);
    expect(nearestIndex(t, 70)).toBe(1);
    expect(nearestIndex(t, 80)).toBe(2);
  });
});

describe("areaPath", () => {
  it("closes the line down to the baseline", () => {
    const pts: Pt[] = [
      { x: 0, y: 50 },
      { x: 10, y: 20 },
    ];
    const a = areaPath(monotonePath(pts), pts, 188);
    expect(a).toContain("L 10,188");
    expect(a).toContain("L 0,188");
    expect(a.endsWith("Z")).toBe(true);
  });
});

describe("buildProjectionChart", () => {
  const base = {
    today: "2026-07-10",
    currentPercent: 54,
    projectedFinish: "2026-07-30",
    plannedEnd: "2026-08-08",
    width: 800,
    yTop: 12,
    yBottom: 188,
  };

  it("carries the line flat to today when the last report is older", () => {
    // Reported Friday, viewed on Sunday: progress today is still 54 percent.
    const c = buildProjectionChart({
      ...base,
      today: "2026-07-12",
      history: [
        { date: "2026-07-08", cumulativePercent: 42 },
        { date: "2026-07-10", cumulativePercent: 54 },
      ],
    });
    expect(c.actual).toHaveLength(3);
    const last = c.actual[c.actual.length - 1];
    const prev = c.actual[c.actual.length - 2];
    // The added point sits at today's x, at exactly the same height.
    expect(last.x).toBe(c.todayX);
    expect(last.y).toBe(prev.y);
    // And the forecast starts from today, not from the stale last report.
    expect(c.projection![0]).toEqual(last);
  });

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
