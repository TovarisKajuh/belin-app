// Money arithmetic for the naročilnica, and later for the invoice that composes
// from it. Pure, tested, and deliberately the ONLY place cents are computed:
// a rounding rule that lives in two files eventually disagrees with itself, and
// this one prints on a document somebody signs.

export interface PoLine {
  description: string;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null;
  total: number;
  sortOrder: number;
}

/**
 * Rounds to cents, correcting for binary floating point. Math.round(x * 100)
 * would round 1.005 DOWN, because the value actually stored is
 * 1.00499999999999989; the exponential detour rounds the decimal the human
 * typed rather than the binary the machine kept.
 */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const rounded = Number(`${Math.round(Number(`${Math.abs(n)}e2`))}e-2`);
  return sign * rounded;
}

/**
 * A line's computed total, or null when it cannot be computed. Null is not
 * zero: a lump sum line carries a typed total with no quantity or unit price,
 * and returning 0 for it would silently wipe out real money.
 */
export function lineTotal(qty: number | null, unitPrice: number | null): number | null {
  if (qty === null || unitPrice === null) return null;
  if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return null;

  // The product is normalized to 10 decimals BEFORE rounding to cents. Without
  // it, 2.5 x 19.99 is held as 49.974999999999994 and rounds down to 49.97,
  // one cent short of the 49.975 the two numbers actually multiply to. Ten
  // decimals is far beyond any real quantity or unit price, so it only ever
  // removes the representation error, never real precision.
  const product = Number((qty * unitPrice).toFixed(10));
  return round2(product);
}

/** The order's net total. Rounded once at the end, never per addition. */
export function poTotals(lines: { total: number }[]): number {
  return round2(lines.reduce((sum, line) => sum + (Number.isFinite(line.total) ? line.total : 0), 0));
}

/**
 * Money as it appears in documents and on screen. The currency is written as
 * the code rather than a symbol: these documents cross borders, and "EUR" is
 * unambiguous in every locale where a euro sign might be placed differently.
 */
export function formatMoney(n: number, locale: "sl" | "de" | "en"): string {
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-GB" : locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    // Grouping is FORCED. Slovenian CLDR omits the separator below five digits
    // ("1000,00"), which is right for prose and wrong for a money column: in a
    // list of amounts the reader wants every thousands mark in the same place.
    useGrouping: "always",
  }).format(round2(n));
  return `${formatted} EUR`;
}
