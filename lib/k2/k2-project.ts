// Turns a K2 parse result into the draft the review screen prefills.
// Pure, total, never throws. This is the seam between "what the plan says" and
// "what a Belin project is": everything here is a SUGGESTION the EPC edits, so
// a wrong guess costs one correction and never blocks creation.
import type { K2ParseResult } from "@/lib/k2/k2-shared";

export interface AddressParts {
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null; // ISO 2 letter, only when the address names one
}

export interface DraftItem {
  name: string;
  qty: number;
  unit: string;
  sortOrder: number;
}

export interface DraftRoof {
  name: string;
  moduleCount: number | null;
  kwp: number | null;
  moduleType: string | null;
  pitchDeg: number | null;
  covering: string | null;
}

export interface ProjectDraft {
  name: string;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  country: string;
  language: string;
  kwp: number | null;
  moduleCount: number | null;
  moduleType: string | null;
  mountingSystem: string | null;
  roofType: string | null;
  /** ISO date the plan states for installation, when it states one. */
  plannedStart: string | null;
  items: DraftItem[];
  /** One entry per roof in the plan. A site is built roof by roof. */
  roofs: DraftRoof[];
}

// The three pilot countries plus the spellings K2 actually prints.
const COUNTRY_NAMES: Record<string, string> = {
  deutschland: "de",
  germany: "de",
  nemcija: "de",
  nemčija: "de",
  österreich: "at",
  oesterreich: "at",
  austria: "at",
  avstrija: "at",
  slovenija: "si",
  slovenia: "si",
  slowenien: "si",
};

// A German or Slovenian postal code followed by a place name.
const ZIP_CITY_RE = /^(\d{4,5})\s+(.+)$/;

/**
 * Best effort split of a one line address into the columns projects carries.
 * Deliberately conservative: anything it cannot split confidently is kept whole
 * as the street, so no text is ever silently dropped before the EPC sees it.
 */
export function splitAddress(raw: string | null): AddressParts {
  const empty: AddressParts = { street: null, zip: null, city: null, country: null };
  if (typeof raw !== "string") return empty;

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p !== "");
  if (parts.length === 0) return empty;

  let country: string | null = null;
  // A trailing country name is consumed before anything else is interpreted.
  const last = parts[parts.length - 1].toLowerCase();
  if (COUNTRY_NAMES[last]) {
    country = COUNTRY_NAMES[last];
    parts.pop();
  }
  if (parts.length === 0) return { ...empty, country };

  // The zip and city ride the last remaining segment; whatever precedes it is
  // the street.
  const tail = parts[parts.length - 1];
  const m = ZIP_CITY_RE.exec(tail);
  if (!m) {
    return { street: parts.join(", "), zip: null, city: null, country };
  }

  const street = parts.slice(0, -1).join(", ");
  return {
    street: street === "" ? null : street,
    zip: m[1],
    city: m[2],
    country,
  };
}

/**
 * Shortens a module description to what belongs on a delivery checklist.
 * "AIKO-A455-MAH54Db (1757x1134x30) 1.757x1.134x30 mm" -> "AIKO-A455-MAH54Db".
 */
function shortModuleName(raw: string): string {
  const cut = raw.split(/\s*\(/)[0].trim();
  return cut === "" ? raw.trim() : cut;
}

/**
 * The modules, as material lines.
 *
 * K2 is a MOUNTING SYSTEM vendor: its article list contains only K2's own
 * hardware (rails, hooks, screws, clamps) and never the panels, which appear
 * only in the roof table because K2 is describing what its rails must carry.
 * Taking the article list as the delivery checklist therefore produces a list
 * with the single biggest item missing, and a crew would tick off 272 screws
 * without ever confirming the 57 panels arrived.
 *
 * Modules are grouped by type, because one project can carry different panels
 * on different roofs, and they lead the list because they are what the truck
 * is mostly full of.
 */
export function moduleItemsFromRoofs(
  roofs: DraftRoof[],
  fallback: { moduleCount: number | null; moduleType: string | null },
): DraftItem[] {
  const byType = new Map<string, number>();

  for (const roof of roofs) {
    if (roof.moduleCount === null || roof.moduleCount <= 0) continue;
    const name = roof.moduleType ? shortModuleName(roof.moduleType) : MODULE_FALLBACK_NAME;
    byType.set(name, (byType.get(name) ?? 0) + roof.moduleCount);
  }

  // Reports whose roof rows do not break out (the 3.1.97 era merges them into
  // one line) still know the project total, which is better than no panels.
  if (byType.size === 0 && fallback.moduleCount !== null && fallback.moduleCount > 0) {
    const name = fallback.moduleType
      ? shortModuleName(fallback.moduleType)
      : MODULE_FALLBACK_NAME;
    byType.set(name, fallback.moduleCount);
  }

  return [...byType.entries()].map(([name, qty], i) => ({
    name,
    qty,
    unit: "kos",
    sortOrder: i,
  }));
}

const MODULE_FALLBACK_NAME = "Modul";

/**
 * The review screen's starting point. Nulls are normal: the EPC fills them in,
 * which is still far less work than typing the whole project.
 */
export function projectDraftFromParse(
  result: K2ParseResult,
  opts: { fallbackCountry: string; locale: string },
): ProjectDraft {
  const meta = result.metadata;
  const address = splitAddress(meta.address);

  const roofs: DraftRoof[] = meta.roofs.map((roof) => ({
    name: roof.name,
    moduleCount: roof.moduleCount,
    kwp: roof.kwp,
    moduleType: roof.moduleType,
    pitchDeg: roof.pitchDeg,
    covering: roof.covering,
  }));

  // Panels first, then K2's own hardware: the article list never contains the
  // modules, so a checklist built from it alone would omit them entirely.
  const modules = moduleItemsFromRoofs(roofs, {
    moduleCount: meta.moduleCount,
    moduleType: meta.moduleDesc,
  });

  return {
    name: meta.projectName ?? "",
    addressStreet: address.street,
    addressZip: address.zip,
    addressCity: address.city,
    // The plan's own country wins over the EPC's default: an EPC in Slovenia
    // routinely builds in Germany, and the country drives the VAT mode.
    country: address.country ?? opts.fallbackCountry,
    language: opts.locale,
    kwp: meta.kwpTotal,
    moduleCount: meta.moduleCount,
    moduleType: meta.moduleDesc,
    mountingSystem: meta.mountingSystem,
    roofType: meta.roofType,
    plannedStart: meta.plannedInstallDate,
    items: [
      ...modules,
      ...result.items.map((item, i) => ({
        name: item.name,
        qty: item.qty,
        unit: "kos",
        sortOrder: modules.length + i,
      })),
    ],
    roofs,
  };
}
