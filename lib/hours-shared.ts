// The working-day clock behind Regiestunden.
//
// Under § 15 VOB/B a subcontractor's hour sheet counts as approved if the
// client says nothing within six WORKING days (Werktage). Werktage are Monday
// to SATURDAY, excluding public holidays: that is the part everybody gets
// wrong, because "working day" in ordinary speech means Monday to Friday and
// the legal term does not. Getting it wrong by one day either approves a claim
// that should still have been open, or tells a subcontractor their claim
// lapsed while it had not.
//
// Everything here is pure and date-only. Times of day never enter the count;
// the deadline becomes a timestamp exactly once, in deadlineTimestamp, at the
// last second of its day.

import { projectZone } from "@/lib/project-time";

export type Country = "si" | "de" | "at";

/** § 15 VOB/B. A parameter everywhere, so a different contract can say otherwise. */
export const DECISION_WORKING_DAYS = 6;

// Two full years, because a December submission counts into January and a
// missing 1.1. would silently shorten every year-end deadline by a day.
// Movable feasts were computed from Easter (2026-04-05, 2027-03-28) rather
// than copied. Germany is the FEDERAL list only in v1: Bundesland calendars
// are post-v1, and the effect of the missing ones is always a deadline that is
// too early rather than too late, which errs toward the subcontractor keeping
// their claim.
export const HOLIDAYS: Record<Country, string[]> = {
  si: [
    "2026-01-01", "2026-01-02", "2026-02-08", "2026-04-06", "2026-04-27",
    "2026-05-01", "2026-05-02", "2026-06-25", "2026-08-15", "2026-10-31",
    "2026-11-01", "2026-12-25", "2026-12-26",
    "2027-01-01", "2027-01-02", "2027-02-08", "2027-03-29", "2027-04-27",
    "2027-05-01", "2027-05-02", "2027-06-25", "2027-08-15", "2027-10-31",
    "2027-11-01", "2027-12-25", "2027-12-26",
  ],
  de: [
    "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-01", "2026-05-14",
    "2026-05-25", "2026-10-03", "2026-12-25", "2026-12-26",
    "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-01", "2027-05-06",
    "2027-05-17", "2027-10-03", "2027-12-25", "2027-12-26",
  ],
  at: [
    "2026-01-01", "2026-01-06", "2026-04-06", "2026-05-01", "2026-05-14",
    "2026-05-25", "2026-06-04", "2026-08-15", "2026-10-26", "2026-11-01",
    "2026-12-08", "2026-12-25", "2026-12-26",
    "2027-01-01", "2027-01-06", "2027-03-29", "2027-05-01", "2027-05-06",
    "2027-05-17", "2027-05-27", "2027-08-15", "2027-10-26", "2027-11-01",
    "2027-12-08", "2027-12-25", "2027-12-26",
  ],
};

const DAY_MS = 86400000;

function toUtcDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * A Werktag: Monday to Saturday, minus that country's public holidays. Sunday
 * is never one, anywhere the product operates.
 */
export function isWorkingDay(iso: string, country: Country): boolean {
  const date = toUtcDate(iso);
  if (date.getUTCDay() === 0) return false;
  return !HOLIDAYS[country].includes(isoOf(date));
}

/**
 * The date `days` working days after `startIso`. The start day itself does not
 * count: a sheet submitted on Friday has its first working day on Saturday (or
 * Monday, where Saturday is a holiday).
 */
export function addWorkingDays(startIso: string, days: number, country: Country): string {
  let cursor = toUtcDate(startIso);
  let remaining = Math.max(0, Math.floor(days));

  // A generous ceiling on iterations: even a fortnight of holidays cannot make
  // six working days take more than a couple of months, and an unbounded loop
  // in a date routine is how a server hangs on a bad input.
  let guard = 0;
  while (remaining > 0 && guard < 400) {
    cursor = new Date(cursor.getTime() + DAY_MS);
    guard++;
    if (isWorkingDay(isoOf(cursor), country)) remaining--;
  }

  return isoOf(cursor);
}

/**
 * The stored deadline: the last instant of the deadline DAY at the SITE.
 *
 * The zone is not a formatting detail here. Storing 23:59:59Z would mean the
 * deadline actually falls at 01:59 the following morning in Ljubljana, which
 * hands the client two extra hours and, worse, prints as the wrong DATE on
 * every screen that renders it in local time. A deadline everybody can read
 * differently is not a deadline.
 */
export function deadlineTimestamp(deadlineDateIso: string, country: Country): string {
  const wallClock = Date.parse(`${deadlineDateIso.slice(0, 10)}T23:59:59.000Z`);
  const offset = zoneOffsetMs(new Date(wallClock), projectZone(country));
  return new Date(wallClock - offset).toISOString();
}

/** How far the given zone was from UTC at that moment, in milliseconds. */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(at)
    .filter((part) => part.type !== "literal");

  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asIfUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour") % 24,
    value("minute"),
    value("second"),
  );

  return asIfUtc - at.getTime();
}

export type SheetStatus = "draft" | "submitted" | "approved" | "rejected" | "deemed_approved";

/**
 * What a sheet's status really is right now, including the deemed approval
 * that the database has not written down yet.
 *
 * The persistence happens lazily (on the hours page, and before any document
 * that quotes hours), so between the deadline passing and the next page load
 * the stored row still says "submitted". Every DISPLAY goes through this, so
 * nobody is ever shown a claim as pending when the clock already decided it.
 * An explicit approval or rejection is never rewritten: silence approves, but
 * a decision that was actually made stands.
 */
export function effectiveStatus(
  row: { status: SheetStatus; deadline_at: string | null },
  now: Date,
): SheetStatus {
  if (row.status !== "submitted" || !row.deadline_at) return row.status;
  return Date.parse(row.deadline_at) < now.getTime() ? "deemed_approved" : row.status;
}

/**
 * Working days between now and the deadline, for the countdown badge. Zero on
 * the deadline day itself, and never negative: once it has passed, the number
 * stops being the story and the status takes over.
 */
export function workingDaysLeft(deadlineIso: string, now: Date, country: Country): number {
  const deadline = toUtcDate(deadlineIso);
  let cursor = toUtcDate(isoOf(now));
  if (cursor.getTime() >= deadline.getTime()) return 0;

  let count = 0;
  let guard = 0;
  while (cursor.getTime() < deadline.getTime() && guard < 400) {
    cursor = new Date(cursor.getTime() + DAY_MS);
    guard++;
    if (isWorkingDay(isoOf(cursor), country)) count++;
  }

  return count;
}
