"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/auth-core";
import { endPersonSession, startPersonSession } from "@/lib/auth";
import { clearDemoCookie } from "@/lib/demo/session";
import { notifyFounderOfSignup, signupOpen } from "@/lib/data/signups";
import { signupRpcError, type ConfirmError } from "@/lib/signup-shared";

export type ConfirmSignupState = { error: ConfirmError | null };

function safeLocale(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  return (routing.locales as readonly string[]).includes(raw) ? raw : routing.defaultLocale;
}

/**
 * POST only, for the reason the magic link and the invite are: mail scanners
 * open every link before the human does, and a GET that created the company
 * would greet the real person with "already used". The whole creation is one
 * database function holding a row lock (complete_epc_signup), so a double
 * click cannot make two companies.
 */
export async function confirmSignupAction(
  _prev: ConfirmSignupState,
  formData: FormData,
): Promise<ConfirmSignupState> {
  if (!signupOpen()) return { error: "closed" };
  const raw = String(formData.get("token") ?? "");
  const locale = safeLocale(formData.get("locale"));
  if (!raw || raw.length > 128) return { error: "invalid" };

  const db = createAdminClient();
  const { data, error } = await db.rpc("complete_epc_signup", { p_token_hash: hashToken(raw) });
  if (error) return { error: signupRpcError(error.message) };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.org_id || !row?.person_id) return { error: "generic" };

  // The phone may still hold the meeting's guest crew session (D18) or a Demo
  // Door persona. Revoke that session row server side before the new
  // company's own session takes the cookie, so the guest session cannot be
  // replayed and the demo persona is not left signed in on the buyer's phone.
  // The presenter cookie goes too, exactly as on logout: a new customer's
  // session must never carry the Demo Door's persona switch.
  await endPersonSession();
  await clearDemoCookie();
  await startPersonSession(row.person_id);

  // The founder hears about it once the response is out: the new customer
  // must not wait on an email to us.
  const orgId = row.org_id;
  try {
    after(() => notifyFounderOfSignup(orgId).catch(() => {}));
  } catch {
    await notifyFounderOfSignup(orgId).catch(() => {});
  }

  // redirect throws, so it stays outside any try/catch.
  redirect(`/${locale}/app?dobrodoslica=1`);
}
