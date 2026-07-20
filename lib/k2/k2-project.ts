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
 * The review screen's starting point. Nulls are normal: the EPC fills them in,
 * which is still far less work than typing the whole project.
 */
export function projectDraftFromParse(
  result: K2ParseResult,
  opts: { fallbackCountry: string; locale: string },
): ProjectDraft {
  const meta = result.metadata;
  const address = splitAddress(meta.address);

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
    items: result.items.map((item, i) => ({
      name: item.name,
      qty: item.qty,
      unit: "kos",
      sortOrder: i,
    })),
    roofs: meta.roofs.map((roof) => ({
      name: roof.name,
      moduleCount: roof.moduleCount,
      kwp: roof.kwp,
      moduleType: roof.moduleType,
    })),
  };
}
