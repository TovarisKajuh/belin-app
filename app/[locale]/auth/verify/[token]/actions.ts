"use server";

import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, safeNext } from "@/lib/auth-core";
import { startPersonSession } from "@/lib/auth";

export type ConfirmState = { error: "invalid" | null };

function safeLocale(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  return (routing.locales as readonly string[]).includes(raw) ? raw : routing.defaultLocale;
}

/**
 * Consume a magic link. This runs on POST only: the GET that renders the
 * confirm card must never mutate, because Outlook SafeLinks and similar
 * scanners fetch every link in an email before the human sees it, and would
 * burn a single-use token on the way past.
 *
 * Consumption is ONE conditional update. Both the "not used yet" and the "not
 * expired" guards live in the WHERE clause, so two clicks arriving together
 * cannot both win, and no read-then-write window exists between the check and
 * the write.
 */
export async function confirmLoginAction(
  _prev: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const raw = String(formData.get("token") ?? "");
  const locale = safeLocale(formData.get("locale"));
  const next = safeNext(formData.get("next"));

  if (!raw) return { error: "invalid" };

  const db = createAdminClient();
  const { data, error } = await db
    .from("login_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(raw))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("person_id")
    .maybeSingle();

  if (error || !data) return { error: "invalid" };

  await startPersonSession(data.person_id);
  // redirect throws, so it stays outside any try/catch.
  redirect(next ?? `/${locale}/app`);
}
