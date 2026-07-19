import { describe, it, expect } from "vitest";
import {
  ddmm,
  monotonePath,
  buildTempoSeries,
  requiredRate,
  trailingMean,
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

describe("buildTempoSeries", () => {
  it("returns nothing without history", () => {
    expect(buildTempoSeries({ history: [], start: "2026-07-06", today: "2026-07-10" })).toEqual([]);
  });

  it("converts cumulative history into per-day gains", () => {
    // Mon 06.07 to Wed 08.07
    const bars = buildTempoSeries({
      history: [
        { date: "2026-07-06", cumulativePercent: 6 },
        { date: "2026-07-07", cumulativePercent: 13 },
        { date: "2026-07-08", cumulativePercent: 21 },
      ],
      start: "2026-07-06",
      today: "2026-07-08",
    });
    expect(bars.map((b) => b.gain)).toEqual([6, 7, 8]);
    expect(bars.map((b) => b.day)).toEqual([1, 2, 3]);
  });

  it("omits weekends entirely rather than drawing them as zero", () => {
    // Fri 10.07, Sat 11, Sun 12, Mon 13. Only the two weekdays may appear.
    const bars = buildTempoSeries({
      history: [
        { date: "2026-07-10", cumulativePercent: 10 },
        { date: "2026-07-13", cumulativePercent: 18 },
      ],
      start: "2026-07-10",
      today: "2026-07-13",
    });
    expect(bars).toHaveLength(2);
    expect(bars.map((b) => b.date)).toEqual(["2026-07-10", "2026-07-13"]);
    expect(bars[1].gain).toBe(8);
  });

  it("distinguishes a reported zero from a missing report", () => {
    const bars = buildTempoSeries({
      history: [
        { date: "2026-07-06", cumulativePercent: 10 },
        // 07.07 reported, but nothing installed: cumulative unchanged.
        { date: "2026-07-07", cumulativePercent: 10 },
        // 08.07 absent entirely: no report arrived.
        { date: "2026-07-09", cumulativePercent: 17 },
      ],
      start: "2026-07-06",
      today: "2026-07-09",
    });
    expect(bars.map((b) => b.gain)).toEqual([10, 0, null, 7]);
  });

  it("never produces a negative bar if history is not monotonic", () => {
    const bars = buildTempoSeries({
      history: [
        { date: "2026-07-06", cumulativePercent: 20 },
        { date: "2026-07-07", cumulativePercent: 18 },
      ],
      start: "2026-07-06",
      today: "2026-07-07",
    });
    expect(bars[1].gain).toBe(0);
  });
});

describe("requiredRate", () => {
  it("spreads the job evenly over the planned working days", () => {
    // Mon 06.07 to Fri 10.07 inclusive is 5 working days.
    expect(requiredRate("2026-07-06", "2026-07-10")).toBeCloseTo(20, 5);
  });
  it("returns null when either planned date is missing", () => {
    expect(requiredRate(null, "2026-08-18")).toBeNull();
    expect(requiredRate("2026-07-07", null)).toBeNull();
  });
});

describe("trailingMean", () => {
  const bars = [
    { date: "a", day: 1, gain: 6, cumulative: 6 },
    { date: "b", day: 2, gain: 8, cumulative: 14 },
    { date: "c", day: 3, gain: null, cumulative: null },
    { date: "d", day: 4, gain: 4, cumulative: 18 },
  ];
  it("averages the last N reported days", () => {
    expect(trailingMean(bars, 3, 3)).toBeCloseTo((4 + 8 + 6) / 3, 5);
  });
  it("skips missing reports instead of treating them as zero", () => {
    // Without the skip this would be (4+0+8)/3 = 4 and read as a slowdown.
    expect(trailingMean(bars, 3, 2)).toBeCloseTo((4 + 8) / 2, 5);
  });
  it("returns null when nothing has been reported yet", () => {
    expect(trailingMean([{ date: "a", day: 1, gain: null, cumulative: null }], 0, 5)).toBeNull();
  });
});

