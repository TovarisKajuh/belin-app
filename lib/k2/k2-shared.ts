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
