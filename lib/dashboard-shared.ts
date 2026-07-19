// Pure formatting and chart geometry for the EPC dashboard. No server-only
// imports, so vitest can exercise it directly. Dates are ISO "YYYY-MM-DD" and
// handled at UTC midnight, so a rendered day never drifts with the timezone.

import { businessDaysBetween, type DailyProgressPoint } from "@/lib/projection-shared";

export function ddmm(iso: string | null): string | null {
  if (!iso || iso.length < 10) return null;
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

// Short weekday for the log feed, in the reader's language.
export function weekdayShort(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
    new Date(iso + "T00:00:00Z")
  );
}

// One bar of the tempo chart: what a single working day produced.
//
// The three states are deliberately distinct and must never be conflated. A
// reported zero means the crew was on site and installed nothing, which is a
// real observation and evidence in a dispute. A missing day means no report
// arrived at all. Non-working days are not observations and never appear.
export interface TempoBar {
  date: string;
  /** 1-based working-day index since the project start. */
  day: number;
  /** Percentage points gained that day. null when no report exists. */
  gain: number | null;
  cumulative: number | null;
}

// Enumerate every working day from start to today and attach what each one
// produced. Weekends and holidays are simply absent from the axis rather than
// drawn as zeros, which is the construction reporting convention: a zero bar
// accuses the crew, and a weekend must never do that.
export function buildTempoSeries(input: {
  history: DailyProgressPoint[];
  start: string;
  today: string;
}): TempoBar[] {
  const { history, start, today } = input;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  const byDate = new Map(sorted.map((p) => [p.date, p.cumulativePercent]));
  const from = start < sorted[0].date ? start : sorted[0].date;

  const bars: TempoBar[] = [];
  let previousCumulative = 0;
  let day = 0;

  const cursor = new Date(from + "T00:00:00Z");
  const end = new Date(today + "T00:00:00Z");
  while (cursor <= end) {
    const weekday = cursor.getUTCDay();
    if (weekday >= 1 && weekday <= 5) {
      const iso = cursor.toISOString().slice(0, 10);
      day += 1;
      const cumulative = byDate.get(iso);
      if (cumulative === undefined) {
        bars.push({ date: iso, day, gain: null, cumulative: null });
      } else {
        // Guard against a non-monotonic history producing a negative bar.
        const gain = Math.max(0, cumulative - previousCumulative);
        bars.push({ date: iso, day, gain, cumulative });
        previousCumulative = cumulative;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return bars;
}

// The pace the original plan demands: the whole job spread evenly across the
// planned working days. Known as takt time in lean construction. Deliberately
// flat rather than recomputed daily: a line that drops as the crew gets ahead
// makes the target look like it is getting easier, and "every bar above the
// line" has to mean one thing forever.
export function requiredRate(plannedStart: string | null, plannedEnd: string | null): number | null {
  if (!plannedStart || !plannedEnd) return null;
  const days = businessDaysBetween(plannedStart, plannedEnd);
  if (days <= 0) return null;
  return 100 / days;
}

// Trailing mean over the last `window` reported days, ignoring days with no
// report so a missing report never reads as a slowdown. Trailing, not centred:
// the last point must be today, since the whole question is "how are we doing
// right now".
export function trailingMean(bars: TempoBar[], index: number, window: number): number | null {
  let sum = 0;
  let n = 0;
  for (let i = index; i >= 0 && n < window; i--) {
    const g = bars[i].gain;
    if (g == null) continue;
    sum += g;
    n++;
  }
  return n === 0 ? null : sum / n;
}


// "+95 Moduli · +40 Podkonstrukcija". Scope item names are project data, so
// they stay in the project's own language rather than the reader's.
export function quantitySummary(
  quantities: { name: string; qty: number }[],
  locale: string
): string {
  const nf = new Intl.NumberFormat(locale);
  return quantities
    .filter((q) => q.qty !== 0)
    .map((q) => `+${nf.format(q.qty)} ${q.name}`)
    .join(" · ");
}

export type Pt = { x: number; y: number };

function r(n: number): number {
  return Math.round(n * 100) / 100;
}

// Monotone cubic interpolation (Fritsch-Carlson), the same curve d3 calls
// curveMonotoneX. It passes through every point and is guaranteed never to
// overshoot between them, so the drawn line can never imply progress that was
// not reported.
//
// This replaced an earlier approach that clamped control point positions inside
// each segment. That also prevented overshoot, but it flattened the curve at
// every data point and read as a rigid staircase. Fritsch-Carlson constrains
// the tangents instead, which stays fluid while keeping the same guarantee.
export function monotonePath(points: Pt[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${r(points[0].x)},${r(points[0].y)}`;
  if (n === 2) {
    return `M ${r(points[0].x)},${r(points[0].y)} L ${r(points[1].x)},${r(points[1].y)}`;
  }

  // Secant slope of each segment.
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1].x - points[i].x;
    dx.push(h);
    slope.push(h === 0 ? 0 : (points[i + 1].y - points[i].y) / h);
  }

  // Tangent at each point: the average of its neighbouring secants, flattened
  // to zero at a local extremum so the curve turns without bulging past it.
  const m: number[] = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }

  // Fritsch-Carlson: keep each tangent pair inside a circle of radius 3, which
  // is the condition that makes the cubic monotone on every segment.
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const scale = 3 / Math.sqrt(s);
      m[i] = scale * a * slope[i];
      m[i + 1] = scale * b * slope[i];
    }
  }

  let d = `M ${r(points[0].x)},${r(points[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d +=
      ` C ${r(points[i].x + h)},${r(points[i].y + m[i] * h)}` +
      ` ${r(points[i + 1].x - h)},${r(points[i + 1].y - m[i + 1] * h)}` +
      ` ${r(points[i + 1].x)},${r(points[i + 1].y)}`;
  }
  return d;
}




