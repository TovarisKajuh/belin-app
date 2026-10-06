"use server";

import { getTranslations } from "next-intl/server";
import { after } from "next/server";
import { findOrCreateCrewByEmail } from "@/lib/data/crew";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, newRawToken, LOGIN_TOKEN_TTL_MIN } from "@/lib/auth-core";
import { sendEmail, renderEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";

export type ClaimState = { sent: boolean; error: "invalid" | "email" | "name" | null };

/**
 * A man on the roof joining the app.
 *
 * Two facts have to line up: he is holding this project's link, so he is on the
 * site, and he can open the mail we send, so he is himself. Either alone is not
 * enough. The version of this that listed names and let you tap one meant
 * anybody with a forwarded link could file reports as Luka, and these reports
 * are evidence.
 *
 * From here it is the SAME magic link the office uses. One way into the product
 * for every person in it, rather than a second login system for the roof.
 */
export async function claimCrewAction(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const locale = String(formData.get("locale") ?? "sl");
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "");
  const fullName = String(formData.get("fullName") ?? "");

  const result = await findOrCreateCrewByEmail(token, email, fullName);
  if (!result.ok) return { sent: false, error: result.error };

  const raw = newRawToken();
  const db = createAdminClient();
  const { error } = await db.from("login_tokens").insert({
    person_id: result.personId,
    token_hash: hashToken(raw),
    expires_at: new Date(Date.now() + LOGIN_TOKEN_TTL_MIN * 60000).toISOString(),
  });
  if (error) return { sent: false, error: "invalid" };

  const base = appBaseUrl();
  if (!base) return { sent: false, error: "invalid" };
  // Land him on the site he joined through, not on a picker. He scanned a
  // specific project's code; that is the roof he is standing on.
  const next = encodeURIComponent(`/${locale}/app/${result.projectId}`);
  const url = `${base}/${locale}/auth/verify/${raw}?next=${next}`;

  // Local development only, so the flow can be walked without a real inbox.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] crew magic link for ${email.trim().toLowerCase()}: ${url}`);
  }

  const t = await getTranslations({ locale, namespace: "auth" });
  const html = renderEmail(t("confirmTitle"), [t("loginBody")], t("loginCta"), url);
  const to = email.trim().toLowerCase();

  after(async () => {
    const result = await sendEmail({ to, kind: "login", projectId: null, subject: t("loginSubject"), html });
    // Loud on purpose, the answer to the user stays the same (see auth.ts).
    if (!result.sent) console.error(`[email] crew login link NOT delivered: ${result.reason}`);
  });

  return { sent: true, error: null };
}
