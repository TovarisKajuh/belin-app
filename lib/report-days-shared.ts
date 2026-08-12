// Which days appear in the construction diary, and what number each one gets.
//
// A diary is read as a sequence. Report 7 following report 5 is the thing
// somebody points at in a dispute to argue a day was removed, so the numbers
// here are POSITIONS in the list of days that carry content, never anything
// derived from the calendar. Two weeks of rain between day 2 and day 3 changes
// nothing about the numbering.
//
// A day counts when it carries a report OR an incident. Rain that stopped the
// work produces no quantities and no photos, and is exactly the day the
// subcontractor will want documented when somebody asks why the roof took
// three weeks longer than planned.

export interface DayReportRef {
  dateIso: string;
  /** 1..n, ascending by date, with no gaps by construction. */
  reportNo: number;
}

export function buildDayReports(entryDates: string[], incidentDates: string[]): DayReportRef[] {
  const dates = new Set<string>();
  for (const value of [...entryDates, ...incidentDates]) {
    if (value) dates.add(value.slice(0, 10));
  }

  return [...dates]
    .sort((a, b) => a.localeCompare(b))
    .map((dateIso, index) => ({ dateIso, reportNo: index + 1 }));
}

/**
 * What the diary is CALLED, chosen by the site's country rather than by the
 * reader's language.
 *
 * Slovenia positioning (DECISIONS.md 2026-07-20, after legal research): the
 * statutory gradbeni dnevnik requires handwritten signatures on duplicate paper
 * sheets under the 2008 Pravilnik, and under eIDAS only a qualified signature
 * equals a handwritten one, so nothing produced here can be that document.
 * What it IS, and what it is titled, is the subcontractor's own daily report:
 * contractual documentation between two companies, which is worth having and
 * is not a claim we cannot support. German and Austrian sites keep the ordinary
 * Bautagesbericht name, which carries no such statutory trap.
 */
export function diaryTitleKey(country: string | null | undefined): string {
  return country === "de" || country === "at" ? "final.diaryTitleDeAt" : "final.diaryTitleSi";
}
