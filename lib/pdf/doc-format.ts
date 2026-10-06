// Dates, times and numbers as a document prints them, in the PROJECT's
// language and the SITE's time zone.
//
// ONE RULE, NOT TWO. Every format comes from lib/format.ts (Task 1.11, DECISIONS
// 2026-10-06: Slovenian dates as "6. 10. 2026", German and English with two
// digits, grouping always on). These wrappers only add the site's zone and the
// document words, so a naročilnica can never print "15. 9. 2026" beside
// "16. 09. 2026" again. If padded Slovenian dates are ever wanted, change
// SHORT.sl in lib/format.ts and its tests, once, with a DECISIONS line.
//
// The zone is not cosmetic. Vercel runs in UTC, so a document generated at
// 00:30 in Ljubljana would otherwise print yesterday's date, and an acceptance
// at 10:42 would print as 08:42 (flows-correctness L4).

import { fmtDate, fmtNumber } from "@/lib/format";
import { hhmm, projectZone } from "@/lib/project-time";
import { docText, type DocLocale } from "@/lib/pdf/strings";

const intlLocale = (locale: DocLocale) => (locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : "sl-SI");

/** "6. 10. 2026" in sl, "06.10.2026" in de, "06/10/2026" in en. A yyyy-mm-dd value is that calendar day. */
export function docDate(value: string, locale: DocLocale, country: string | null | undefined): string {
  return fmtDate(value, locale, { timeZone: projectZone(country) });
}

/** "torek, 6. 10. 2026". */
export function docWeekdayDate(value: string, locale: DocLocale, country: string | null | undefined): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  const weekday = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : projectZone(country),
  }).format(date);
  return `${weekday}, ${docDate(value, locale, country)}`;
}

/** "16. 9. 2026 ob 10:42", from doc.dateTime, in the site's zone. */
export function docDateTime(iso: string, locale: DocLocale, country: string | null | undefined): string {
  return docText(locale, "doc.dateTime", {
    date: docDate(iso, locale, country),
    time: hhmm(iso, country),
  });
}

/** "oktober 2026" / "Oktober 2026" for a yyyy-mm month. */
export function docMonth(month: string, locale: DocLocale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-15T12:00:00Z`),
  );
}

/** 245,7 and 1.250 in sl and de, 245.7 and 1,250 in en: lib/format's grouping-always rule. */
export function docNumber(value: number, locale: DocLocale, maxDecimals = 2): string {
  return fmtNumber(value, locale, { maxDecimals });
}

/**
 * A summary cut to at most `max` characters, ending at a word boundary with an
 * ellipsis. A plain slice printed "...zaradi dostave drugega iz" on the
 * completion report cover (production verification, 2026-10-06).
 */
export function clipAtWord(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  // Room for the ellipsis, then back to the last space inside the limit.
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const head = (space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, "");
  return `${head}…`;
}
