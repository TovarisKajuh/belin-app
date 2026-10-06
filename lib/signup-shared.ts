// The pure rules of self-serve signup, testable without a database.
import { normalizeVat, type VatCountry } from "@/lib/vies-shared";

export const SIGNUP_TOKEN_TTL_HOURS = 24;
export const SIGNUP_RATE_PER_EMAIL = 3; // per hour
export const SIGNUP_RATE_PER_IP = 10; // per hour
// Resend allows 100 mails per UTC day on this account (get-usage, 05.10).
export const SIGNUP_MAIL_PER_DAY = 25; // every signup_confirm and signup_exists attempt, all addresses together
export const SIGNUP_PRUNE_DAYS = 10;

export type SignupError =
  | "closed"
  | "vatFormat"
  | "companyRequired"
  | "addressRequired"
  | "nameRequired"
  | "emailInvalid"
  | "consentRequired"
  | "rateLimited"
  | "emailFailed"
  | "generic";

export interface SignupInput {
  vat: string;
  company: string;
  address: string;
  country: string;
  fullName: string;
  email: string;
  phone: string;
  consent: boolean;
}

export interface CleanSignup {
  vatId: string;
  company: string;
  address: string;
  country: VatCountry;
  fullName: string;
  email: string;
  phone: string | null;
}

const COUNTRIES: readonly VatCountry[] = ["si", "at", "de"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function squash(value: string, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

export function validateSignup(
  input: SignupInput,
): { ok: true; value: CleanSignup } | { ok: false; error: SignupError } {
  const selected = (COUNTRIES as readonly string[]).includes(input.country)
    ? (input.country as VatCountry)
    : "si";
  const vat = normalizeVat(input.vat, selected);
  if (!vat) return { ok: false, error: "vatFormat" };

  const company = squash(input.company, 200);
  if (!company) return { ok: false, error: "companyRequired" };
  const address = squash(input.address, 300);
  if (!address) return { ok: false, error: "addressRequired" };
  const fullName = squash(input.fullName, 120);
  if (fullName.length < 2) return { ok: false, error: "nameRequired" };
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) return { ok: false, error: "emailInvalid" };
  if (!input.consent) return { ok: false, error: "consentRequired" };

  return {
    ok: true,
    value: {
      vatId: vat.display,
      company,
      address,
      // The number's own prefix outranks the dropdown.
      country: vat.country,
      fullName,
      email,
      phone: squash(input.phone, 40) || null,
    },
  };
}

export type SignupLinkState = "ready" | "used" | "expired";

export function signupLinkState(
  row: { consumed_at: string | null; expires_at: string },
  now: Date,
): SignupLinkState {
  if (row.consumed_at !== null) return "used";
  return new Date(row.expires_at).getTime() > now.getTime() ? "ready" : "expired";
}

export type ConfirmError = "invalid" | "expired" | "used" | "emailTaken" | "closed" | "generic";

/** complete_epc_signup raises these exact messages (migration 20261006004100). */
export function signupRpcError(message: string): ConfirmError {
  if (message.includes("signup.emailTaken")) return "emailTaken";
  if (message.includes("signup.used")) return "used";
  if (message.includes("signup.expired")) return "expired";
  if (message.includes("signup.invalid")) return "invalid";
  return "generic";
}
