// Pure formatting and chart geometry for the EPC dashboard. No server-only
// imports, so vitest can exercise it directly. Dates are ISO "YYYY-MM-DD" and
// handled at UTC midnight, so a rendered day never drifts with the timezone.

import type { DailyProgressPoint } from "@/lib/projection-shared";

const DAY_MS = 86_400_000;

export function ddmm(iso: string | null): string | null {
  if (!iso || iso.length < 10) return null;
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

export function daysSinceEpoch(iso: string): number {
  return Math.round(new Date(iso + "T00:00:00Z").getTime() / DAY_MS);
}

export function isoFromDays(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

// Short weekday for the log feed, in the reader's language.
export function weekdayShort(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
    new Date(iso + "T00:00:00Z")
  );
}

// Index of the value in a sorted ascending array closest to x. Used by the
// scrub to snap the readout to the nearest reported day, and to look up the
// glide position in the path sample table. Binary search: the scrub calls this
// once per animation frame.
export function nearestIndex(xs: ArrayLike<number>, x: number): number {
  const n = xs.length;
  if (n === 0) return -1;
  if (x <= xs[0]) return 0;
  if (x >= xs[n - 1]) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  return x - xs[lo] <= xs[hi] - x ? lo : hi;
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

// Close a line path into a filled area down to the baseline.
export function areaPath(line: string, points: Pt[], baselineY: number): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${r(last.x)},${r(baselineY)} L ${r(first.x)},${r(baselineY)} Z`;
}

export interface ProjectionChartInput {
  history: DailyProgressPoint[];
  today: string;
  currentPercent: number;
  projectedFinish: string | null;
  plannedEnd: string | null;
  width: number;
  yTop: number;
  yBottom: number;
}

export interface ProjectionChart {
  actual: Pt[];
  /** The dated value behind each point in `actual`, same order, for the readout. */
  points: DailyProgressPoint[];
  projection: Pt[] | null;
  todayX: number | null;
  deadlineX: number | null;
  finishX: number | null;
  buffer: { x: number; width: number } | null;
  yTop: number;
  yBottom: number;
  /** Day numbers bounding the x scale, so the caller can place axis ticks. */
  domainStartDay: number;
  domainEndDay: number;
  xOfDay: (day: number) => number;
}

// Map the progress history and the forecast onto the SVG canvas. The x domain
// spans the first reported day to whichever comes last: the projected finish,
// the deadline, or today. Returns empty actual points when there is no history,
// which the panel renders as its "gathering data" state.
export function buildProjectionChart(input: ProjectionChartInput): ProjectionChart {
  const { history, today, currentPercent, projectedFinish, plannedEnd, width, yTop, yBottom } =
    input;

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  // Cumulative progress is a step function: if the last report predates today,
  // the value today is still the current percent. Carrying the line flat to
  // today keeps it truthful and stops it stopping short of the today marker.
  if (sorted.length > 0 && sorted[sorted.length - 1].date < today) {
    sorted.push({ date: today, cumulativePercent: currentPercent });
  }
  if (sorted.length === 0) {
    const day = daysSinceEpoch(today);
    return {
      actual: [],
      points: [],
      projection: null,
      todayX: null,
      deadlineX: null,
      finishX: null,
      buffer: null,
      yTop,
      yBottom,
      domainStartDay: day,
      domainEndDay: day,
      xOfDay: () => 0,
    };
  }

  const todayN = daysSinceEpoch(today);
  const startN = Math.min(daysSinceEpoch(sorted[0].date), todayN);
  const candidates = [
    daysSinceEpoch(sorted[sorted.length - 1].date),
    todayN,
    projectedFinish ? daysSinceEpoch(projectedFinish) : startN,
    plannedEnd ? daysSinceEpoch(plannedEnd) : startN,
  ];
  let endN = Math.max(...candidates);
  // A single-day domain would divide by zero; give it one day of width.
  if (endN <= startN) endN = startN + 1;

  const span = endN - startN;
  const xOf = (n: number): number => ((n - startN) / span) * width;
  const yOf = (pct: number): number => {
    const c = Math.min(100, Math.max(0, pct));
    return yBottom - (c / 100) * (yBottom - yTop);
  };

  const actual: Pt[] = sorted.map((p) => ({
    x: xOf(daysSinceEpoch(p.date)),
    y: yOf(p.cumulativePercent),
  }));

  const finishX = projectedFinish ? xOf(daysSinceEpoch(projectedFinish)) : null;
  const projection =
    finishX != null && actual.length > 0
      ? [actual[actual.length - 1], { x: finishX, y: yOf(100) }]
      : null;

  const deadlineX = plannedEnd ? xOf(daysSinceEpoch(plannedEnd)) : null;
  const buffer =
    finishX != null && deadlineX != null && deadlineX > finishX
      ? { x: finishX, width: deadlineX - finishX }
      : null;

  return {
    actual,
    points: sorted,
    projection,
    todayX: xOf(todayN),
    deadlineX,
    finishX,
    buffer,
    yTop,
    yBottom,
    domainStartDay: startN,
    domainEndDay: endN,
    xOfDay: xOf,
  };
}
