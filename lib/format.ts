// One place that turns numbers and dates into text, per locale.
//
// The screens printed "58.3" and "245.7 kWp" in English decimals beside a
// Slovenian "6,5", and documents computed dates in UTC, so anything signed
// between midnight and two in the morning carried yesterday's date. Every new
// number or date goes through here; Task 5.5 moves the old call sites.
//
// Pure on purpose: no server import, so client components, server pages and
// the PDF renderer share exactly one rule.

export type AppLocale = "sl" | "de" | "en";

const INTL: Record<AppLocale, string> = { sl: "sl-SI", de: "de-DE", en: "en-GB" };
const NBSP = "\u00a0";

export const DEFAULT_ZONE = "Europe/Ljubljana";

export function asAppLocale(value: string | null | undefined): AppLocale {
  return value === "de" || value === "en" ? value : "sl";
}

/**
 * Grouping is forced, as in formatMoney: Slovenian CLDR leaves four-digit
 * numbers ungrouped ("1250"), and a column of figures wants every thousands
 * mark in the same place.
 */
export function fmtNumber(
  value: number,
  locale: string,
  options: { decimals?: number; maxDecimals?: number } = {},
): string {
  if (!Number.isFinite(value)) return "";
  const { decimals, maxDecimals = 2 } = options;
  return new Intl.NumberFormat(INTL[asAppLocale(locale)], {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? maxDecimals,
    useGrouping: "always",
  }).format(value);
}

/** "245,7 kWp" with a no-break space, so the unit never wraps onto its own line. */
export function fmtKwp(kwp: number, locale: string): string {
  if (!Number.isFinite(kwp)) return "";
  return `${fmtNumber(kwp, locale, { maxDecimals: 2 })}${NBSP}kWp`;
}

/** A 0 to 100 value, which is how progressPercent is stored everywhere. */
export function fmtPct(percent: number, locale: string, decimals = 0): string {
  if (!Number.isFinite(percent)) return "";
  return new Intl.NumberFormat(INTL[asAppLocale(locale)], {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(percent / 100);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Slovenian writes "6. 10. 2026" (Pravopis); German and British English keep
// two digits, which is what their documents and accountants expect.
const SHORT: Record<AppLocale, Intl.DateTimeFormatOptions> = {
  sl: { day: "numeric", month: "numeric", year: "numeric" },
  de: { day: "2-digit", month: "2-digit", year: "numeric" },
  en: { day: "2-digit", month: "2-digit", year: "numeric" },
};
const LONG: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
const DAY_MONTH: Record<AppLocale, Intl.DateTimeFormatOptions> = {
  sl: { day: "numeric", month: "numeric" },
  de: { day: "2-digit", month: "2-digit" },
  en: { day: "2-digit", month: "2-digit" },
};

/**
 * A "yyyy-mm-dd" value is a calendar day (an entry date, a deadline, a
 * valid_until) and is formatted in UTC so it can never move. Anything else is
 * an instant and is shown in the given zone, the project's own by default.
 */
export function fmtDate(
  value: string | Date,
  locale: string,
  options: { style?: "short" | "long" | "dayMonth"; timeZone?: string } = {},
): string {
  const l = asAppLocale(locale);
  const calendarDay = typeof value === "string" && DATE_ONLY.test(value);
  const date =
    value instanceof Date ? value : new Date(calendarDay ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(INTL[l], {
    ...(options.style === "long" ? LONG : options.style === "dayMonth" ? DAY_MONTH[l] : SHORT[l]),
    timeZone: calendarDay ? "UTC" : (options.timeZone ?? DEFAULT_ZONE),
  }).format(date);
}

export function fmtDateTime(value: string | Date, locale: string, timeZone: string = DEFAULT_ZONE): string {
  const l = asAppLocale(locale);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(INTL[l], {
    ...SHORT[l],
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
}
