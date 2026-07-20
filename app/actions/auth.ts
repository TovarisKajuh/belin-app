"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  tokenForCredentials,
  startSession,
  endPersonSession,
  sessionToken,
  otherScenarioToken,
} from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashToken,
  newRawToken,
  safeNext,
  LOGIN_TOKEN_TTL_MIN,
  LOGIN_RATE_MAX,
} from "@/lib/auth-core";
import { sendEmail, renderEmail } from "@/lib/email";

export type LoginState = { error: "invalid" | null };
export type MagicLinkState = { sent: boolean };

function safeLocale(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  return (routing.locales as readonly string[]).includes(raw) ? raw : routing.defaultLocale;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const locale = safeLocale(formData.get("locale"));

  const token = tokenForCredentials(username, password);
  if (!token) return { error: "invalid" };

  await startSession(token);
  // redirect throws, so it must stay outside any try/catch.
  redirect(`/${locale}/app`);
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

  // Crew never receives a login link. Crew reaches the site through the project
  // link on their phone, and a crew account must not open the office surfaces.
  if (!person || person.role === "crew" || !person.email) return { sent: true };

  // Rate limit: a stranger typing somebody's address repeatedly must not be
  // able to fill their inbox.
  const { count } = await db
    .from("login_tokens")
    .select("id", { count: "exact", head: true })
    .eq("person_id", person.id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString());

  if ((count ?? 0) >= LOGIN_RATE_MAX) return { sent: true };

  const { error } = await db.from("login_tokens").insert({
    person_id: person.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + LOGIN_TOKEN_TTL_MIN * 60000).toISOString(),
  });
  if (error) return { sent: true };

  // The link is built from the configured base URL and NEVER from the request's
  // Host header: a poisoned Host would put a live login token into a link
  // pointing at somebody else's server. If it is missing there is no safe
  // guess, so say so loudly rather than emailing a broken link.
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (!base) {
    console.error("NEXT_PUBLIC_APP_URL is not set: cannot build a login link.");
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
    await sendEmail({ to, kind: "login", projectId: null, subject: t("loginSubject"), html });
  });

  return { sent: true };
}

/**
 * Flips the session between the two seeded demo states, keeping the same role.
 * A token outside the demo set is left alone, so this can never move a real
 * project session.
 */
export async function switchScenarioAction(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get("locale"));
  const current = await sessionToken();
  const next = current ? otherScenarioToken(current) : null;
  if (next) await startSession(next);
  redirect(`/${locale}/app`);
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = safeLocale(formData.get("locale"));
  // Revokes the session row when this is a person session, then clears the
  // cookie either way. Deleting the cookie alone is not logout.
  await endPersonSession();
  redirect(`/${locale}`);
}
