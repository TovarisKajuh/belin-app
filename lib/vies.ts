import "server-only";
import { parseViesResponse, type VatNumber, type ViesResult } from "@/lib/vies-shared";

export * from "@/lib/vies-shared";

// The European Commission's public VIES REST service. No key, no account.
// Called once per signup, on blur of one field, never in bulk.
const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
const VIES_TIMEOUT_MS = 4000;

/**
 * Never throws and never hangs: a slow or absent VIES costs the person typing
 * their company name themselves, nothing more. Null means "no usable answer";
 * { valid: false } means VIES answered and does not know the number.
 */
export async function lookupVat(vat: VatNumber, timeoutMs = VIES_TIMEOUT_MS): Promise<ViesResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(VIES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ countryCode: vat.country.toUpperCase(), vatNumber: vat.number }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return parseViesResponse(await res.json(), vat.country);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
