// The site calendar of the demo world: which days a Slovenian crew is on a roof.
//
// Monday to Friday, minus Slovenian public holidays. This is deliberately NOT
// the hour-sheet clock in lib/hours-shared.ts, which counts Saturdays because
// the deemed-approval rule does; a crew that logged every Saturday would read
// as invented. The holiday list IS the hour clock's own, so the two never
// disagree about which days are holidays.

import { isWorkingDay } from "@/lib/hours-shared";
import { projectToday } from "@/lib/project-time";

const DAY_MS = 86400000;

export function isoPlusDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00.000Z`) + n * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Today at a Slovenian site, as yyyy-mm-dd. */
export function todayInLjubljana(now: Date = new Date()): string {
  return projectToday("si", now);
}

/** A day a crew works on a Slovenian site: Monday to Friday and not a public holiday. */
export function isSiteDay(iso: string): boolean {
  const weekday = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`).getUTCDay();
  return weekday >= 1 && weekday <= 5 && isWorkingDay(iso, "si");
}

/** The `count` site days strictly before `iso`, oldest first. */
export function siteDaysBefore(iso: string, count: number): string[] {
  const out: string[] = [];
  for (let n = 1; out.length < count && n < 400; n++) {
    const day = isoPlusDays(iso, -n);
    if (isSiteDay(day)) out.push(day);
  }
  return out.reverse();
}

/** The most recent site day strictly before `iso`. */
export function lastSiteDayBefore(iso: string): string {
  return siteDaysBefore(iso, 1)[0];
}

/** The n-th site day strictly before `iso`; n = 1 is the previous site day. */
export function nthSiteDayBefore(iso: string, n: number): string {
  return siteDaysBefore(iso, n)[0];
}

/** `iso` itself when it is a site day, otherwise the next one. */
export function siteDayOnOrAfter(iso: string): string {
  let day = iso.slice(0, 10);
  for (let guard = 0; !isSiteDay(day) && guard < 400; guard++) day = isoPlusDays(day, 1);
  return day;
}
