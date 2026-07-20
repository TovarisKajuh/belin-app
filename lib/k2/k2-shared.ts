// The public, pure K2 parser API.
//
// DELIBERATELY NOT "server-only" (see the K2 parser plan, finding 4): every
// module under lib/k2 is Node safe pure logic. The vitest suite and the
// scripts/k2-try.ts harness import them under plain Node, where an
// `import "server-only"` throws. They hold no secrets and read no environment.
// The wizard's server actions are the only app callers.
//
// Every function here is TOTAL: hostile input yields nulls, empty arrays and
// warning codes, never a throw.

export interface K2LineItem {
  position: number; // for review screen ordering
  articleNo: string; // exactly 7 digits, kept as a string
  name: string; // verbatim, unicode preserved
  qty: number;
  weightKg: number | null;
}

export type K2WarningCode =
  | "no_articles" // fingerprint ok, zero article rows anywhere
  | "per_roof_fallback" // no total list, items aggregated from per roof lists
  | "weight_mismatch" // sum of row weights disagrees with the printed Summe
  | "meta_incomplete"; // fewer than 3 metadata fields resolved

export interface K2Roof {
  name: string; // "Dach 1"
  moduleCount: number | null;
  kwp: number | null;
}

export interface K2Metadata {
  projectName: string | null;
  reportVersion: string | null;
  reportDate: string | null; // ISO "2025-02-27"
  author: string | null;
  customer: string | null;
  company: string | null;
  address: string | null;
  mountingSystem: string | null;
  moduleDesc: string | null;
  moduleWp: number | null;
  moduleCount: number | null;
  kwpTotal: number | null;
  windZone: string | null;
  snowZone: string | null;
  roofType: string | null;
  pitchDeg: number | null;
  verified: boolean | null;
  roofs: K2Roof[];
}

export interface K2ParseResult {
  ok: boolean; // false ONLY when the fingerprint is absent
  metadata: K2Metadata;
  items: K2LineItem[];
  warnings: K2WarningCode[];
}

export function emptyMetadata(): K2Metadata {
  return {
    projectName: null,
    reportVersion: null,
    reportDate: null,
    author: null,
    customer: null,
    company: null,
    address: null,
    mountingSystem: null,
    moduleDesc: null,
    moduleWp: null,
    moduleCount: null,
    kwpTotal: null,
    windZone: null,
    snowZone: null,
    roofType: null,
    pitchDeg: null,
    verified: null,
    roofs: [],
  };
}

export interface K2Footer {
  version: string;
  dateIso: string;
  projectName: string;
}

// The footer sits on every content page and never on the cover, so detection
// scans all pages. "K2 Base Report" does NOT translate: German reports print
// "K2 Base Bericht" on the cover and this exact English string in the footer.
const FOOTER_RE =
  /^K2 Base Report (\S+) \| (\d{2})\.(\d{2})\.(\d{4}) \| (.+?) (\d+)\/(\d+)$/;

export function toLines(pageText: string): string[] {
  if (typeof pageText !== "string") return [];
  return pageText.split("\n").map((l) => l.trim());
}

// The breadcrumb sits on the line after this exact anchor, near the end of the
// page text, and is what tells an article list apart from a project total or
// an overview page. Exact equality matters: K2's annotations PDF carries the
// words "Connecting Strength" without the leading pipe.
const BREADCRUMB_ANCHOR = "| Connecting Strength";

/**
 * Page furniture rather than content: the breadcrumb anchor, the breadcrumb's
 * own footer line, the vendor URL. Positional pairing must stop at these, or a
 * short value run silently absorbs them and shifts every field.
 */
export function isStructuralLine(line: string): boolean {
  return (
    line === BREADCRUMB_ANCHOR ||
    FOOTER_RE.test(line) ||
    /^www\./i.test(line)
  );
}

/** The page's breadcrumb, or null when the page carries none. */
export function readBreadcrumb(lines: string[]): string | null {
  const anchorAt = lines.indexOf(BREADCRUMB_ANCHOR);
  // An anchor on the LAST line (covers, closing pages) has no breadcrumb after it.
  if (anchorAt === -1 || anchorAt === lines.length - 1) return null;
  return lines[anchorAt + 1];
}

/** Every footer line across all pages, in page order. Total: never throws. */
export function parseFooters(pagesText: string[]): K2Footer[] {
  if (!Array.isArray(pagesText)) return [];

  const out: K2Footer[] = [];
  for (const page of pagesText) {
    for (const line of toLines(page)) {
      const m = FOOTER_RE.exec(line);
      if (!m) continue;
      out.push({
        version: m[1],
        dateIso: `${m[4]}-${m[3]}-${m[2]}`,
        projectName: m[5].trim(),
      });
    }
  }
  return out;
}

/** The most frequent value in a list, ties broken by first appearance. */
export function mostFrequent<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null;

  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);

  let best: T = values[0];
  let bestCount = 0;
  for (const v of values) {
    const c = counts.get(v) ?? 0;
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/**
 * A document is a K2 Base report when at least TWO pages carry the footer
 * fingerprint. Two, not one, so that another document quoting a single K2
 * footer line cannot false positive. The annotations fixture (K2's own
 * explanatory PDF) carries zero footers and is the negative proof.
 */
export function detectK2(pagesText: string[]): { isK2: boolean; version: string | null } {
  const footers = parseFooters(pagesText);
  if (footers.length < 2) return { isK2: false, version: null };

  return { isK2: true, version: mostFrequent(footers.map((f) => f.version)) };
}

/**
 * Parses a number written in COMMA DECIMAL contexts: weights, Summe values,
 * Bodenschneelast. Not a universal number parser, and deliberately so.
 *
 * The period is ambiguous in K2 output and is resolved by counting the digits
 * after the LAST period: 3 or more means a thousands separator ("2.700" is
 * 2700), 1 or 2 means a decimal ("4.40" is 4.4). Roof row kWp cells use PERIOD
 * decimals with 3 digits ("18.655 kWp" is 18.655), which this rule reads as
 * thousands, so callers in that context must not use this function; the
 * metadata module computes roof kWp from Wp times count instead.
 */
export function parseGermanNumber(raw: string): number | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  // Load bearing early return: Number("") is 0, not NaN.
  if (trimmed === "" || trimmed === "-") return null;

  const compact = trimmed.replace(/\s+/g, "");
  if (!/\d/.test(compact)) return null;

  const hasDot = compact.includes(".");
  const hasComma = compact.includes(",");

  let normalized: string;
  if (hasDot && hasComma) {
    // German full form: dots are thousands, the comma is the decimal.
    normalized = compact.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = compact.replace(",", ".");
  } else if (hasDot) {
    const lastDot = compact.lastIndexOf(".");
    const trailing = compact.length - lastDot - 1;
    normalized = trailing >= 3 ? compact.replace(/\./g, "") : compact;
  } else {
    normalized = compact;
  }

  // Reject anything that is not a plain signed decimal, so "1,2,3", "1e5" and
  // "Infinity" resolve to null instead of a surprising number.
  if (!/^-?\d*\.?\d+$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  return Math.round(value * 1000) / 1000;
}
