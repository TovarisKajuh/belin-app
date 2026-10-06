"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { routing } from "@/i18n/routing";
import { lookupVat, normalizeVat, formatAddressLine, type VatCountry } from "@/lib/vies";
import { validateSignup, type SignupError } from "@/lib/signup-shared";
import { createSignup, hashIp, pruneStaleSignups, signupOpen } from "@/lib/data/signups";

export type SignupState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; error: SignupError };

export type VatLookup =
  | { status: "badFormat" }
  | { status: "unavailable" | "invalid"; vat: string; country: VatCountry }
  | { status: "valid"; vat: string; country: VatCountry; name: string | null; address: string | null };

function safeLocale(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  return (routing.locales as readonly string[]).includes(raw) ? raw : routing.defaultLocale;
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// 20 VIES lookups per IP per ten minutes per instance: plenty for a person
// correcting a typo, useless as a free VIES proxy that could get our fra1
// egress throttled by VIES on the evening the buyer signs up.
const viesHits = new Map<string, number[]>();
function viesAllowed(ip: string): boolean {
  const now = Date.now();
  const recent = (viesHits.get(ip) ?? []).filter((t) => now - t < 600_000);
  if (recent.length >= 20) return false;
  recent.push(now);
  viesHits.set(ip, recent);
  if (viesHits.size > 5000) viesHits.clear();
  return true;
}

/**
 * On blur of the VAT field. Read-only, and as cheap as one VIES call. Public,
 * so it closes with the signup kill switch and is limited per IP.
 */
export async function lookupVatAction(raw: string, fallbackCountry: string): Promise<VatLookup> {
  if (!signupOpen()) return { status: "badFormat" };
  const fallback: VatCountry = fallbackCountry === "at" || fallbackCountry === "de" ? fallbackCountry : "si";
  const vat = normalizeVat(String(raw ?? "").slice(0, 32), fallback);
  if (!vat) return { status: "badFormat" };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  // Over the limit the person still gets a normalized number and types the
  // name and address, exactly as when VIES is down.
  if (!viesAllowed(ip)) return { status: "unavailable", vat: vat.display, country: vat.country };

  const result = await lookupVat(vat);
  if (!result) return { status: "unavailable", vat: vat.display, country: vat.country };
  if (!result.valid) return { status: "invalid", vat: vat.display, country: vat.country };
  return {
    status: "valid",
    vat: vat.display,
    country: vat.country,
    name: result.name,
    address: formatAddressLine(result),
  };
}

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  if (!signupOpen()) return { status: "error", error: "closed" };
  const locale = safeLocale(formData.get("locale"));

  const input = {
    vat: field(formData, "vat"),
    company: field(formData, "company"),
    address: field(formData, "address"),
    country: field(formData, "country"),
    fullName: field(formData, "fullName"),
    email: field(formData, "email"),
    phone: field(formData, "phone"),
    consent: formData.get("consent") === "on",
  };

  // The honeypot. A person never sees this field; a bot that fills it gets the
  // same answer a person gets, and nothing is stored or sent.
  if (field(formData, "website") !== "") {
    return { status: "sent", email: input.email.trim().toLowerCase() };
  }

  const checked = validateSignup(input);
  if (!checked.ok) return { status: "error", error: checked.error };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "";
  const result = await createSignup(checked.value, {
    locale,
    ipHash: ip ? hashIp(ip) : null,
    userAgent: (h.get("user-agent") ?? "").slice(0, 300) || null,
  });

  // Deferred and swallowed, the plan-imports sweep pattern: a failed prune must
  // never fail a signup, and the next signup retries it.
  try {
    after(() => pruneStaleSignups().catch(() => {}));
  } catch {
    // Outside a request scope there is nothing to defer to.
  }

  if (!result.ok) return { status: "error", error: result.error };
  return { status: "sent", email: checked.value.email };
}
