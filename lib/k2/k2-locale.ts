// Locale packs: every piece of K2 vocabulary the parser knows, as DATA.
//
// K2 Base exports in the planner's UI language. The founder's own account
// exports English; the German reports we started from are one dialect of the
// same document. Nothing about the structure changes between them, only words,
// number conventions and date separators. So words live here in a table, and
// the parsing modules ask the table rather than hardcoding German.
//
// Adding a third language (K2 also ships French and Italian) is an entry in
// LOCALES plus a fixture. It is not a redesign.
//
// This is a LEAF module: it imports nothing from lib/k2.
import type { K2Footer } from "@/lib/k2/k2-core";

export type K2Lang = "de" | "en";

export interface K2LocalePack {
  lang: K2Lang;
  terms: {
    billOfMaterial: string;
    statics: string;
    results: string;
    overviewCrumb: string;
    overviewHeading: string;
    roofsSection: string;
    assembly: string;
    /** Crumb segments starting with any of these are structure, never area names. */
    moduleFieldPrefixes: string[];
    totalWord: string;
    verifiedBanner: string;
    warningBanner: string;
  };
  labels: {
    /** COVER ONLY. A bare Adresse/Address on the cover is the planning
     *  company's own office, not the site. See the trap note below. */
    coverAddress: string[];
    customer: string[];
    company: string[];
    /** Array order is priority: Autor wins over Bearbeiter wins over Planer. */
    author: string[];
    plannedInstall: string[];
    /** OVERVIEW page, where the same label does mean the site. */
    address: string[];
    windZone: string[];
    snowZone: string[];
    windSpeed: string[];
    name: string[];
    mountingSystem: string[];
    staticsAnchor: string;
    roofType: string[];
    pitch: string[];
  };
  blockLabels: string[];
  blockHeadings: string[];
  coverings: string[];
}

// THE COVER ADDRESS TRAP, verified on all five real reports: a new era cover
// prints the project address AND, three lines later, the planning company's own
// office under a bare "Adresse"/"Address" label. On the founder's own export
// that office is in Maribor while the site is in Wiener Neustadt. Only
// coverAddress may fill the project address on page one.

export const LOCALES: Record<K2Lang, K2LocalePack> = {
  de: {
    lang: "de",
    terms: {
      billOfMaterial: "Artikelliste",
      statics: "Statikbericht",
      results: "Ergebnisse",
      overviewCrumb: "Projektübersicht",
      overviewHeading: "Projektinformation",
      roofsSection: "Dächer",
      assembly: "Montageplan",
      // "Modulbl" catches both "Modulblock 4" and the umlaut plural "Modulblöcke".
      moduleFieldPrefixes: ["Modulfeld", "Modulbl", "Vormontage"],
      totalWord: "Summe",
      verifiedBanner: "DAS PROJEKT IST VERIFIZIERT",
      // NOTE: new era German reports print "Bitte überprüfen Sie die
      // Warnung(en)!" directly under the verified banner. K2 still calls those
      // projects verified, so that phrase is deliberately NOT matched here;
      // only the genuinely unverified state carries this string.
      warningBanner: "ENTHÄLT WARNUNG",
    },
    labels: {
      coverAddress: ["Projektadresse"],
      customer: ["Kunde"],
      company: ["Gesellschaft"],
      author: ["Autor", "Bearbeiter", "Planer"],
      plannedInstall: ["Geplantes Installationsdatum"],
      address: ["Adresse"],
      windZone: ["Windlastzone"],
      snowZone: ["Schneelastzone"],
      windSpeed: ["Windgeschwindigkeit"],
      name: ["Name"],
      mountingSystem: ["Montagesystem"],
      staticsAnchor: "Allgemeine Informationen",
      roofType: ["Eindeckung"],
      pitch: ["Dachneigung"],
    },
    blockLabels: [
      "Adresse",
      "Bemessung",
      "Schadensfolgeklasse",
      "Nutzungsdauer",
      "Geländekategorie",
      "Windlastzone",
      "Schneelastzone",
      "Bodenschneelast",
    ],
    blockHeadings: ["Lasten", "Projektinformation", "Materialeigenschaften", "Dächer"],
    coverings: [
      "Ziegel",
      "Blech",
      "Blechfalz",
      "Bitumen",
      "Trapezblech",
      "Wellblech",
      "Kies",
      "Folie",
    ],
  },
  en: {
    lang: "en",
    terms: {
      billOfMaterial: "Bill of material",
      statics: "Structural analysis report",
      results: "Results",
      overviewCrumb: "Project overview",
      overviewHeading: "Project information",
      roofsSection: "Roofs",
      assembly: "Assembly plan",
      moduleFieldPrefixes: ["Module array", "Module block"],
      totalWord: "Total",
      verifiedBanner: "THE PROJECT IS VERIFIED",
      warningBanner: "CONTAINS WARNING",
    },
    labels: {
      coverAddress: ["Project address"],
      customer: ["Customer"],
      company: ["Company"],
      author: ["Author", "Planner"],
      plannedInstall: ["Planned installation date"],
      address: ["Address"],
      windZone: ["Wind load zone"],
      snowZone: ["Snow load zone"],
      windSpeed: ["Basic wind speed"],
      name: ["Name"],
      // Capital S is K2's own spelling on the statics page, verified.
      mountingSystem: ["Mounting System", "Mounting system"],
      staticsAnchor: "General information",
      roofType: ["Roof covering"],
      pitch: ["Roof pitch"],
    },
    blockLabels: [
      "Address",
      "Design method",
      "Failure consequence class (CC)",
      "Design working life",
      "Terrain category",
      "Wind load zone",
      "Snow load zone",
      "Snow load on ground level",
    ],
    blockHeadings: ["Loads", "Load settings", "Project information", "Material values", "Roofs"],
    coverings: ["Tile", "Sheet metal", "Corrugated sheet", "Bitumen", "Gravel", "Foil"],
  },
};

/**
 * Which language a report is written in.
 *
 * The footer date separator decides it, because footers are a per report
 * constant printed on every content page: German writes 04.03.2026, English
 * writes 24/03/2026. Only when there are no footers at all does this fall back
 * to counting pack vocabulary, and a tie resolves to German.
 */
export function inferLocale(pagesText: string[], footers: K2Footer[]): K2Lang {
  if (Array.isArray(footers) && footers.length > 0) {
    let slashes = 0;
    let dots = 0;
    for (const f of footers) {
      if (f.dateSeparator === "/") slashes += 1;
      else dots += 1;
    }
    if (slashes > dots) return "en";
    if (dots > 0) return "de";
  }

  if (!Array.isArray(pagesText) || pagesText.length === 0) return "de";
  const text = pagesText.join("\n");

  const score = (lang: K2Lang) => {
    const pack = LOCALES[lang];
    const probes = [
      pack.terms.billOfMaterial,
      pack.terms.statics,
      pack.terms.overviewCrumb,
      pack.terms.roofsSection,
      pack.labels.staticsAnchor,
    ];
    return probes.reduce((n, probe) => (text.includes(probe) ? n + 1 : n), 0);
  };

  return score("en") > score("de") ? "en" : "de";
}

/**
 * A number in the report's own convention.
 *
 * de: comma decimal, with the period ambiguity resolved by counting trailing
 * digits, because German K2 reports genuinely mix ("292,9 kg" but "8.1 degrees"
 * and "5.34 kWp"). Three or more digits after the last period means thousands.
 * en: period decimal, commas are thousands ("1,961" is 1961 mm).
 *
 * Total: hostile input yields null, never a throw.
 */
export function parseLocaleNumber(raw: string, lang: K2Lang): number | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  // Load bearing: Number("") is 0, not NaN.
  if (trimmed === "" || trimmed === "-") return null;

  const compact = trimmed.replace(/\s+/g, "");
  if (!/\d/.test(compact)) return null;

  const hasDot = compact.includes(".");
  const hasComma = compact.includes(",");

  let normalized: string;
  if (lang === "en") {
    // Commas are always grouping; the period is always the decimal point.
    normalized = compact.replace(/,/g, "");
  } else if (hasDot && hasComma) {
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

/** "24.03.2026" and "24/03/2026" both mean 2026-03-24. Day first in both. */
export function parseLocaleDate(raw: string): string | null {
  if (typeof raw !== "string") return null;

  const m = /^(\d{2})[./-](\d{2})[./-](\d{4})$/.exec(raw.trim());
  if (!m) return null;

  const [, day, month, year] = m;
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;

  return `${year}-${month}-${day}`;
}
