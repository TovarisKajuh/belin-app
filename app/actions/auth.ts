"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { endPersonSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashToken,
  newRawToken,
  safeNext,
  LOGIN_TOKEN_TTL_MIN,
  LOGIN_RATE_MAX,
  LOGIN_DAILY_MAX,
} from "@/lib/auth-core";
import { sendEmail, renderEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
import { clearDemoCookie } from "@/lib/demo/session";

export type MagicLinkState = { sent: boolean };

function safeLocale(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  return (routing.locales as readonly string[]).includes(raw) ? raw : routing.defaultLocale;
}

/**
 * Request a magic link.
 *
 * The answer is ALWAYS the same: check your email. An unknown address, a crew
 * member's address and a rate-limited address are indistinguishable from a
 * successful send, so this form cannot be used to find out who has an account.
 * The token is minted on every path, including the ones that send nothing, so
 * the timing does not reveal what the wording refuses to.
 */
export async function requestMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const locale = safeLocale(formData.get("locale"));
  const next = safeNext(formData.get("next"));

  // Minted unconditionally: the work must not depend on whether the person
  // exists.
  const raw = newRawToken();
  const tokenHash = hashToken(raw);

  if (!email) return { sent: true };

  const db = createAdminClient();
  const { data: person } = await db
    .from("people")
    .select("id, role, email")
    .ilike("email", email)
    .maybeSingle();

  // Crew receive a login link like everybody else.
  //
  // They used to be refused here, on the theory that a link on the phone was
  // enough. It was not: crew use this app every working day, and an anonymous
  // link means anyone holding it can file a report under any name. One verified
  // way in for every person in the product, office or roof, is both safer and
  // one system instead of two. What still separates them is what they can
  // REACH once inside, which is the office gate's job, not the login's.
  if (!person || !person.email) return { sent: true };

  // Rate limit: a stranger typing somebody's address repeatedly must not be
  // able to fill their inbox, and at most 10 links per person per rolling 24 h
  // (Task 4.3 Step 7a): the Resend account sends 100 mails per UTC day, so a
  // stranger can at worst delay one person's link, never spend the whole
  // account's budget. Fails closed: an unknown count sends nothing.
  const now = Date.now();
  const [live, today] = await Promise.all([
    db
      .from("login_tokens")
      .select("id", { count: "exact", head: true })
      .eq("person_id", person.id)
      .is("used_at", null)
      .gt("expires_at", new Date(now).toISOString()),
    db
      .from("login_tokens")
      .select("id", { count: "exact", head: true })
      .eq("person_id", person.id)
      .gt("created_at", new Date(now - 86_400_000).toISOString()),
  ]);
  if (live.error || today.error) return { sent: true };
  if ((live.count ?? 0) >= LOGIN_RATE_MAX || (today.count ?? 0) >= LOGIN_DAILY_MAX) return { sent: true };

  const { error } = await db.from("login_tokens").insert({
    person_id: person.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + LOGIN_TOKEN_TTL_MIN * 60000).toISOString(),
  });
  if (error) return { sent: true };

  const base = appBaseUrl();
  if (!base) {
    console.error("No app base URL available: cannot build a login link.");
    return { sent: true };
  }

  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  const url = `${base}/${locale}/auth/verify/${raw}${query}`;

  // Local development only: the link is printed so the flow can be walked
  // without a real inbox. Never in production, where this would put a live
  // credential into the log stream.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] magic link for ${person.email}: ${url}`);
  }

  const t = await getTranslations({ locale, namespace: "auth" });
  const html = renderEmail(t("confirmTitle"), [t("loginBody")], t("loginCta"), url);

  // after() runs the send once the response is out: off the latency sensitive
  // path, without detaching a promise the serverless runtime could freeze.
  const to = person.email;
  after(async () => {
    const result = await sendEmail({ to, kind: "login", projectId: null, subject: t("loginSubject"), html });
    // Loud on purpose: on 05.10.2026 no login link had left for days and the
    // form kept saying "sent". The answer to the user stays the same.
    if (!result.sent) console.error(`[email] login link NOT delivered: ${result.reason}`);
  });

  return { sent: true };
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get("locale"));
  // Revokes the session row when this is a person session, then clears the
  // cookie either way. Deleting the cookie alone is not logout.
  await endPersonSession();
  await clearDemoCookie();
  redirect(`/${locale}`);
}
