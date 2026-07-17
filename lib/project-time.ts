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
