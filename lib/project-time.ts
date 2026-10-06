// The crew's "today" is the calendar day at the site, not UTC. Vercel runs in
// UTC, so a late-evening or early-morning entry would otherwise be filed on the
// wrong day, which matters for the Bautagebuch and the VOB hour-sheet clock.
// Framework-free so it is shared by the data layer and unit tested.

const ZONE_BY_COUNTRY: Record<string, string> = {
  si: "Europe/Ljubljana",
  de: "Europe/Berlin",
  at: "Europe/Vienna",
};

export function projectZone(country: string | null | undefined): string {
  return (country && ZONE_BY_COUNTRY[country]) || "Europe/Ljubljana";
}

// Returns the site-local calendar date as yyyy-mm-dd. `now` is injectable for tests.
export function projectToday(country: string | null | undefined, now: Date = new Date()): string {
  // en-CA formats as yyyy-mm-dd; the timeZone option gives the local calendar day.
  return new Intl.DateTimeFormat("en-CA", { timeZone: projectZone(country) }).format(now);
}

// Returns the site-local clock time of an ISO timestamp as HH:MM, 24 hour.
// Used to show when a material check happened (checked_at is a full timestamptz;
// the crew and EPC read it in the project's own zone).
export function hhmm(iso: string, country: string | null | undefined): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: projectZone(country),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * The instant at which the site's wall clock reads `hhmm` on `dateIso`.
 *
 * For timestamps that are composed rather than observed (the demo seed writes
 * "the crew filed at 15:20"). Two passes, so a time on the day the clocks
 * change still lands on the right side of the switch.
 */
export function zonedInstant(dateIso: string, hhmm: string, country: string | null | undefined): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || !/^\d{2}:\d{2}$/.test(hhmm)) {
    throw new Error(`zonedInstant: expected yyyy-mm-dd and HH:MM, got ${dateIso} ${hhmm}`);
  }
  const zone = projectZone(country);
  const wall = Date.parse(`${dateIso}T${hhmm}:00.000Z`);
  const first = offsetAt(new Date(wall), zone);
  const second = offsetAt(new Date(wall - first), zone);
  return new Date(wall - second).toISOString();
}

function offsetAt(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return (
    Date.UTC(value("year"), value("month") - 1, value("day"), value("hour") % 24, value("minute"), value("second")) -
    at.getTime()
  );
}
