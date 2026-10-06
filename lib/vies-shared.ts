// Reading a company from its VAT number, the pure half.
//
// VIES (the EU's VAT Information Exchange System) is the only free, official
// and keyless source of a company's registered name and address across the
// three pilot countries. What it returns differs by member state, verified
// against the live service on 2026-10-05:
//   - Slovenia: name and address in CAPITALS, house numbers zero padded
//     ("DUNAJSKA CESTA 050, LJUBLJANA, 1000 LJUBLJANA").
//   - Austria: mixed case on two lines with a country prefix on the postcode
//     ("Am Hof 6a\nAT-1010 Wien").
//   - Germany: validity only, "---" for name and address, by German policy.
// Everything here is a SUGGESTION the person edits, so a wrong guess costs one
// correction and never blocks a signup.

export type VatCountry = "si" | "at" | "de";

export interface VatNumber {
  country: VatCountry;
  /** The number as VIES wants it: no prefix, Austrian numbers keep their U. */
  number: string;
  /** Prefix and number, the form stored and printed: SI80267432. */
  display: string;
}

export interface ViesResult {
  valid: boolean;
  name: string | null;
  street: string | null;
  postcode: string | null;
  city: string | null;
}

const PREFIX: Record<string, VatCountry> = { SI: "si", AT: "at", DE: "de" };
const FORMAT: Record<VatCountry, RegExp> = {
  si: /^\d{8}$/,
  at: /^U\d{8}$/,
  de: /^\d{9}$/,
};

export function normalizeVat(raw: string, fallbackCountry: VatCountry): VatNumber | null {
  const compact = String(raw ?? "").toUpperCase().replace(/[\s.\-/]/g, "");
  if (!compact) return null;

  let country = fallbackCountry;
  let number = compact;
  const prefix = PREFIX[compact.slice(0, 2)];
  if (prefix) {
    country = prefix;
    number = compact.slice(2);
  }
  // Austrians often type the eight digits and forget the U every UID carries.
  if (country === "at" && /^\d{8}$/.test(number)) number = `U${number}`;

  if (!FORMAT[country].test(number)) return null;
  return { country, number, display: `${country.toUpperCase()}${number}` };
}

// Words Slovenian writes in lower case inside a street or place name: the
// generic street words and the prepositions. Proper names stay capitalised
// ("Cesta Staneta Žagarja"), which is why this is a list and not a rule.
const LOWER_SL = new Set([
  "cesta", "ceste", "ulica", "ulici", "pot", "trg", "nabrežje", "naselje", "mesto", "republike",
  "na", "pri", "ob", "pod", "nad", "v", "in", "za", "iz", "do", "od", "s", "z", "k", "proti",
]);
// Slovenian legal forms as VIES prints them: D.O.O., D.D., S.P., K.D., with an
// optional trailing comma.
const LEGAL_FORM = /^([A-ZČŠŽ]{1,3}\.)+,?$/;
const BLANK = new Set(["", "---"]);

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return BLANK.has(trimmed) ? null : trimmed;
}

function isShouting(text: string): boolean {
  return text === text.toUpperCase() && /[A-ZČŠŽĆĐ]/.test(text);
}

function capitalize(word: string): string {
  return word
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join("-");
}

// "050" -> "50", "017A" -> "17a": VIES pads house numbers, a letter suffix is
// written lower case in Slovenian addresses.
function houseNumber(token: string): string | null {
  const m = /^0*(\d+)([A-Z]?)(,?)$/.exec(token);
  return m ? `${m[1]}${m[2].toLowerCase()}${m[3]}` : null;
}

export function slovenianCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((token, i) => {
      const number = houseNumber(token);
      if (number !== null) return number;
      if (LEGAL_FORM.test(token)) return token.toLowerCase();
      const lower = token.toLowerCase();
      if (i > 0 && LOWER_SL.has(lower.replace(/,$/, ""))) return lower;
      return capitalize(lower);
    })
    .join(" ");
}

export function tidyCompanyName(name: string, country: VatCountry): string {
  // Only Slovenia shouts. "VERBUND AG" is how the Austrian register spells it.
  return country === "si" && isShouting(name) ? slovenianCase(name) : name;
}

export function splitViesAddress(
  address: string,
  country: VatCountry,
): { street: string | null; postcode: string | null; city: string | null } {
  const segments = address
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return { street: null, postcode: null, city: null };

  const tidy = (s: string) => (country === "si" && isShouting(s) ? slovenianCase(s) : s);

  // The post code and town ride the last segment, with an optional "AT-".
  const m = /^(?:[A-Z]{1,2}-)?(\d{4,5})\s+(.+)$/.exec(segments[segments.length - 1]);
  const rest = m ? segments.slice(0, -1) : segments;
  const city = m ? tidy(m[2].trim()) : null;
  const postcode = m ? m[1] : null;

  // Slovenian addresses repeat the settlement before the post town; it is
  // kept only when it says something the town does not.
  const kept = rest.filter(
    (s, i) => i === 0 || city === null || tidy(s).toLowerCase() !== city.toLowerCase(),
  );
  const street = kept.length ? kept.map(tidy).join(", ") : null;
  return { street, postcode, city };
}

export function parseViesResponse(json: unknown, country: VatCountry): ViesResult | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (o.actionSucceed === false || "errorWrappers" in o) return null;
  if (typeof o.valid !== "boolean") return null;
  if (!o.valid) return { valid: false, name: null, street: null, postcode: null, city: null };

  const name = clean(o.name);
  const address = clean(o.address);
  const parts = address
    ? splitViesAddress(address, country)
    : { street: null, postcode: null, city: null };
  return { valid: true, name: name ? tidyCompanyName(name, country) : null, ...parts };
}

export function formatAddressLine(parts: {
  street: string | null;
  postcode: string | null;
  city: string | null;
}): string | null {
  const town = [parts.postcode, parts.city].filter(Boolean).join(" ");
  const line = [parts.street, town].filter(Boolean).join(", ");
  return line === "" ? null : line;
}
