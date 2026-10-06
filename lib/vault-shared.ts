export type ExpiryState = "valid" | "expiringSoon" | "expired" | "none";

/** Inside this many days of expiry, a document is amber rather than green. */
export const EXPIRY_WARN_DAYS = 30;

/**
 * The traffic light on a compliance document.
 *
 * This matters more than it looks. An A1 certificate that expired yesterday
 * means the crew on the roof today is not legally posted, which is the EPC's
 * problem as much as the subcontractor's. So expiry is judged by DATE, not by
 * timestamp: a document valid until the 20th is valid for all of the 20th, in
 * every timezone anyone here works in, and only turns red on the 21st.
 */
export function expiryState(validUntil: string | null | undefined, now: Date): ExpiryState {
  if (!validUntil) return "none";

  const until = Date.parse(`${validUntil.slice(0, 10)}T23:59:59.999Z`);
  if (Number.isNaN(until)) return "none";

  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (until < today) return "expired";

  const daysLeft = Math.floor((until - today) / 86400000);
  return daysLeft <= EXPIRY_WARN_DAYS ? "expiringSoon" : "valid";
}

/**
 * The document types the vault knows, in the order they are offered. A1 and the
 * Freistellungsbescheinigung lead deliberately: they are the two that stop a
 * German site, so they are the two an EPC chases.
 */
export const VAULT_TYPES = [
  "a1",
  "freistellungsbescheinigung",
  "unbedenklichkeitsbescheinigung",
  "id_document",
  "qualification",
  "hfu_status",
  "zko_notification",
  "insurance",
  "other",
] as const;

export type VaultType = (typeof VAULT_TYPES)[number];

/**
 * The documents whose ABSENCE is the finding on a site in this country, listed
 * even when nothing was uploaded. The Freistellungsbescheinigung is German law
 * (§ 48b EStG): asking for it on a Slovenian roof reads as a product built for
 * somebody else, and the EPC there owes nobody that certificate.
 */
export function requiredVaultTypes(siteCountry: string | null | undefined): VaultType[] {
  return siteCountry === "de" ? ["a1", "freistellungsbescheinigung"] : ["a1"];
}

export function isVaultType(value: string): value is VaultType {
  return (VAULT_TYPES as readonly string[]).includes(value);
}

/**
 * The stored file extension comes from the validated mime type, never from the
 * uploaded filename: a name is attacker-controlled text, and "a1.pdf.exe" or a
 * name carrying path separators has no business reaching a storage path.
 */
const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function extensionForMime(mime: string): string | null {
  return MIME_EXTENSIONS[mime] ?? null;
}
