// Pure projection and working-day math for the EPC dashboard. No server-only
// imports, so vitest can exercise it directly. All dates are ISO "YYYY-MM-DD"
// and treated at UTC midnight to avoid timezone drift.

export type DailyProgressPoint = { date: string; cumulativePercent: number };

export interface ProjectionInput {
  history: DailyProgressPoint[];
  currentPercent: number;
  today: string;
  plannedStart: string | null;
  plannedEnd: string | null;
}

export interface Projection {
  ratePctPerDay: number | null;
  projectedFinish: string | null;
  workingDaysElapsed: number | null;
  workingDaysTotal: number | null;
  daysVsDeadline: number | null;
}

function toUtc(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeekday(d: Date): boolean {
  const g = d.getUTCDay();
  return g >= 1 && g <= 5;
}

// Count Mon-Fri days between two ISO dates, inclusive of both ends, order independent.
export function businessDaysBetween(startIso: string, endIso: string): number {
  let start = toUtc(startIso);
  let end = toUtc(endIso);
  if (end < start) {
    const t = start;
    start = end;
    end = t;
  }
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (isWeekday(cur)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

// The ISO date that is `n` working days after `startIso` (not counting startIso).
function addWorkingDays(startIso: string, n: number): string {
  const cur = toUtc(startIso);
  let added = 0;
  while (added < n) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (isWeekday(cur)) added++;
  }
  return isoOf(cur);
}

// Forecast completion from the recent slope of cumulative weighted progress.
// Rate is the average weighted percent gained per working day over the last
// up to 6 progress points. Returns null forecasts when there is too little
// signal (fewer than 2 points) or no upward movement. Working-day totals and
// the deadline buffer are only computed when the planned dates are set.
export function computeProjection(input: ProjectionInput): Projection {
  const { history, currentPercent, today, plannedStart, plannedEnd } = input;

  const workingDaysElapsed = plannedStart ? businessDaysBetween(plannedStart, today) : null;
  const workingDaysTotal =
    plannedStart && plannedEnd ? businessDaysBetween(plannedStart, plannedEnd) : null;

  const points = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);

  let ratePctPerDay: number | null = null;
  let projectedFinish: string | null = null;

  if (points.length >= 2) {
    const first = points[0];
    const last = points[points.length - 1];
    const gain = last.cumulativePercent - first.cumulativePercent;
    const intervals = Math.max(1, businessDaysBetween(first.date, last.date) - 1);
    const rate = gain / intervals;
    if (rate > 0) {
      ratePctPerDay = Math.round(rate * 10) / 10;
      const remaining = Math.max(0, 100 - currentPercent);
      const daysNeeded = Math.ceil(remaining / rate);
      projectedFinish = daysNeeded <= 0 ? today : addWorkingDays(today, daysNeeded);
    }
  }

  let daysVsDeadline: number | null = null;
  if (projectedFinish && plannedEnd) {
    daysVsDeadline =
      projectedFinish <= plannedEnd
        ? Math.max(0, businessDaysBetween(projectedFinish, plannedEnd) - 1)
        : -Math.max(0, businessDaysBetween(plannedEnd, projectedFinish) - 1);
  }

  return { ratePctPerDay, projectedFinish, workingDaysElapsed, workingDaysTotal, daysVsDeadline };
}

/**
 * Working days between a project's finish and the date it was promised for.
 * Positive is buffer, negative is overrun, in the same sign convention as
 * daysVsDeadline so the two can share one mark on screen.
 *
 * This is the one number that means the same thing on a project that is running
 * and on one that was delivered two months ago. Cumulative progress does not:
 * every finished project is at 100 percent, so a progress line on a delivered
 * job is a shape with no information in it, and a wall of them is worse than
 * nothing because it looks like data.
 *
 * A running project is judged on where its current pace lands it; a delivered
 * one on where it actually landed. Same question, same units, different tense.
 */
export function scheduleVarianceDays(input: {
  status: string;
  plannedEnd: string | null;
  /** The last day work was reported. Null when nothing was ever reported. */
  lastReportedDate: string | null;
  /** Projection for a project still running, from computeProjection. */
  projectedDaysVsDeadline: number | null;
}): number | null {
  const { status, plannedEnd, lastReportedDate, projectedDaysVsDeadline } = input;
  if (!plannedEnd) return null;

  // Delivered: the answer is a fact, not a forecast.
  if (status === "finished") {
    if (!lastReportedDate) return null;
    return lastReportedDate <= plannedEnd
      ? Math.max(0, businessDaysBetween(lastReportedDate, plannedEnd) - 1)
      : -Math.max(0, businessDaysBetween(plannedEnd, lastReportedDate) - 1);
  }

  // Never started, or started and never reported: there is no pace to project
  // from, and inventing one would put a confident mark on a blank project.
  return projectedDaysVsDeadline;
}
