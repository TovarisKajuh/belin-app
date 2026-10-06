/**
 * Who legally operates Belin.
 *
 * This is the one place the operator's identity is written down. The Impressum
 * and the privacy policy both read it, so there is no way for the two to
 * disagree about who the controller is.
 *
 * EVERY FIELD BELOW IS NULL UNTIL THE FOUNDER FILLS IT IN, AND THAT IS
 * DELIBERATE. An Impressum is a legal declaration about a real company: a
 * plausible looking one with invented details is worse than none at all,
 * because it is a false statement rather than a missing one. So while any
 * required field is null, `legalPublished()` is false, both pages return 404
 * and the footer links do not render. Fill these in and both pages go live on
 * the next deploy with no other change.
 *
 * Requirements this satisfies once filled:
 *   Germany, § 5 DDG (which replaced § 5 TMG in May 2024): full name, a real
 *   physical address (a PO box is not enough), quick contact including email,
 *   the representative, and the register and VAT identifiers where they exist.
 *   Slovenia, ZEPT: the same identifying set.
 */
export interface Operator {
  /** Registered company name, exactly as in the register. */
  legalName: string | null;
  /** e.g. "d.o.o.", "s.p.", "GmbH". Part of the name for most Slovenian forms. */
  legalForm: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  /** Country name, in the page's own language. */
  country: string | null;
  email: string | null;
  /** § 5 DDG expects a fast contact route. A phone number is the usual one. */
  phone: string | null;
  /** The person who represents the company. */
  representative: string | null;
  /** Registration: AJPES matična številka, or the Handelsregister entry. */
  registerNumber: string | null;
  /** VAT identification number, e.g. SI12345678. Null if not VAT registered. */
  vatId: string | null;
}

// Filled 2026-10-06 from the founder's answer to Task 0.6 c and d and the
// AJPES / bizi.si register entry he supplied: AVESOL d.o.o. operates Belin.
export const OPERATOR: Operator = {
  legalName: "AVESOL",
  legalForm: "d.o.o.",
  street: "Poštna ulica 1",
  zip: "2000",
  city: "Maribor",
  country: "Slovenija",
  email: "info@avesol.eu",
  phone: null,
  representative: "Jan Drozg, direktor",
  registerNumber: "9788778000",
  vatId: "SI26459973",
};

/**
 * The fields without which the pages must not be published.
 *
 * `vatId` and `registerNumber` are excluded on purpose: a sole trader may
 * legitimately have neither, and the pages simply omit what is null.
 */
const REQUIRED = [
  "legalName",
  "street",
  "zip",
  "city",
  "country",
  "email",
  "representative",
] as const satisfies readonly (keyof Operator)[];

/** True only when the operator is fully identified. */
export function legalPublished(): boolean {
  return REQUIRED.every((field) => {
    const value = OPERATOR[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

/** The fields still missing, for the message the founder actually needs. */
export function missingLegalFields(): string[] {
  return REQUIRED.filter((field) => {
    const value = OPERATOR[field];
    return !(typeof value === "string" && value.trim().length > 0);
  });
}

/**
 * The version of the Pogoji uporabe a signup agrees to. Stored on the signup
 * row and on the organization (terms_version), so "which terms did this
 * customer accept" always has an answer. Change it whenever the terms text in
 * lib/legal-copy.ts changes in substance.
 */
export const TERMS_VERSION = "2026-10-06";

/**
 * Where a stuck customer reaches a person: the signup confirmation, the closed
 * signup page and the first-run help card. From the founder's answer 0.6 d.
 */
export const SUPPORT: { email: string; phone: string | null } = {
  email: OPERATOR.email ?? "info@getbelin.com",
  phone: OPERATOR.phone,
};
