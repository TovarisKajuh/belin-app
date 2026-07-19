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

// Short weekday for the log feed, in the reader's language.
export function weekdayShort(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
    new Date(iso + "T00:00:00Z")
  );
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

// Smooth a polyline into a cubic path that passes exactly through every point
// (Catmull-Rom converted to Bezier). Control points are clamped inside each
// segment's own y range, so a smooth curve can never bulge past the data and
// imply progress that was never reported.
export function smoothPath(points: Pt[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${r(points[0].x)},${r(points[0].y)}`;

  let d = `M ${r(points[0].x)},${r(points[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    let c1y = p1.y + (p2.y - p0.y) / 6;
    let c2y = p2.y - (p3.y - p1.y) / 6;

    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    c1y = Math.min(hi, Math.max(lo, c1y));
    c2y = Math.min(hi, Math.max(lo, c2y));

    d += ` C ${r(c1x)},${r(c1y)} ${r(c2x)},${r(c2y)} ${r(p2.x)},${r(p2.y)}`;
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
  projectedFinish: string | null;
  plannedEnd: string | null;
  width: number;
  yTop: number;
  yBottom: number;
}

export interface ProjectionChart {
  actual: Pt[];
  projection: Pt[] | null;
  todayX: number | null;
  deadlineX: number | null;
  finishX: number | null;
  buffer: { x: number; width: number } | null;
  yTop: number;
  yBottom: number;
}

// Map the progress history and the forecast onto the SVG canvas. The x domain
// spans the first reported day to whichever comes last: the projected finish,
// the deadline, or today. Returns empty actual points when there is no history,
// which the panel renders as its "gathering data" state.
export function buildProjectionChart(input: ProjectionChartInput): ProjectionChart {
  const { history, today, projectedFinish, plannedEnd, width, yTop, yBottom } = input;

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) {
    return {
      actual: [],
      projection: null,
      todayX: null,
      deadlineX: null,
      finishX: null,
      buffer: null,
      yTop,
      yBottom,
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
    projection,
    todayX: xOf(todayN),
    deadlineX,
    finishX,
    buffer,
    yTop,
    yBottom,
  };
}
