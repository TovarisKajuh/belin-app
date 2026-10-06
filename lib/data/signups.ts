import "server-only";
import { createHmac } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, newRawToken } from "@/lib/auth-core";
import { sendEmail, renderEmail, type SendResult } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
import { legalPublished, TERMS_VERSION } from "@/lib/legal";
import { fmtDateTime } from "@/lib/format";
import {
  signupLinkState,
  SIGNUP_MAIL_PER_DAY,
  SIGNUP_PRUNE_DAYS,
  SIGNUP_RATE_PER_EMAIL,
  SIGNUP_RATE_PER_IP,
  SIGNUP_TOKEN_TTL_HOURS,
  type CleanSignup,
} from "@/lib/signup-shared";

/**
 * Self-serve signup is on only when the kill switch says so AND the legal
 * pages exist. Consent to terms that 404 is not consent.
 */
export function signupOpen(): boolean {
  return process.env.SIGNUP_OPEN === "1" && legalPublished();
}

/** HMAC of the client IP: enough for a one-hour rate limit, useless to anyone else. */
export function hashIp(ip: string): string {
  const key = process.env.SIGNUP_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "belin";
  return createHmac("sha256", key).update(`signup-ip:${ip}`).digest("hex");
}

/**
 * Whether the provider took the message (Task 1.9: nothing may be called sent
 * until sendEmail returned sent: true). The one place in Wave 4 that reads it.
 */
function accepted(result: SendResult): boolean {
  return result.sent;
}

export type CreateSignupResult =
  | { ok: true }
  | { ok: false; error: "rateLimited" | "emailFailed" | "generic" };

export async function createSignup(
  input: CleanSignup,
  meta: { locale: string; ipHash: string | null; userAgent: string | null },
): Promise<CreateSignupResult> {
  const db = createAdminClient();
  const since = new Date(Date.now() - 3_600_000).toISOString();

  const { count: byEmail, error: emailCountError } = await db
    .from("signups")
    .select("id", { count: "exact", head: true })
    .eq("email", input.email)
    .gt("created_at", since);
  if (emailCountError) return { ok: false, error: "generic" };
  if ((byEmail ?? 0) >= SIGNUP_RATE_PER_EMAIL) return { ok: false, error: "rateLimited" };

  // Resend allows 100 mails per UTC day on this account (get-usage, 05.10). The
  // public form may use a quarter of it, never the login links' share. Fails
  // closed: an unknown count must not become an unlimited sender.
  const { count: mailedToday, error: mailedError } = await db
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .in("kind", ["signup_confirm", "signup_exists"])
    .gt("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if (mailedError || (mailedToday ?? 0) >= SIGNUP_MAIL_PER_DAY) return { ok: false, error: "rateLimited" };

  if (meta.ipHash) {
    const { count: byIp } = await db
      .from("signups")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", meta.ipHash)
      .gt("created_at", since);
    if ((byIp ?? 0) >= SIGNUP_RATE_PER_IP) return { ok: false, error: "rateLimited" };
  }

  const base = appBaseUrl();
  if (!base) {
    console.error("No app base URL available: cannot build a signup link.");
    return { ok: false, error: "generic" };
  }
  const t = await getTranslations({ locale: meta.locale, namespace: "signup" });

  // An address that already has an account gets the same screen as a new one
  // and learns the rest in its own inbox, so this form cannot be used to find
  // out who uses Belin (the login form's rule, app/actions/auth.ts).
  const { data: existing } = await db
    .from("people")
    .select("id")
    // Exact: every stored address is lowercase (checked on 06.10; the
    // constraint itself arrives with the rest of Task 1.7), and ILIKE would
    // treat _ and % in an address as wildcards. A miss here is still caught
    // at confirm: complete_epc_signup compares lower(email).
    .eq("email", input.email)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { count: told } = await db
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("to_email", input.email)
      .eq("kind", "signup_exists")
      .gt("created_at", since);
    // The same answer a new address gets on its fourth try within the hour.
    // Answering "sent" here would let four submits reveal who has an account.
    if ((told ?? 0) >= SIGNUP_RATE_PER_EMAIL) return { ok: false, error: "rateLimited" };

    const html = renderEmail(t("existsTitle"), [t("existsBody")], t("existsCta"), `${base}/${meta.locale}/login`);
    const sent = await sendEmail({
      to: input.email,
      kind: "signup_exists",
      projectId: null,
      subject: t("existsSubject"),
      html,
    });
    return accepted(sent) ? { ok: true } : { ok: false, error: "emailFailed" };
  }

  const raw = newRawToken();
  const now = new Date();
  const { error: insertError } = await db.from("signups").insert({
    email: input.email,
    full_name: input.fullName,
    phone: input.phone,
    company_name: input.company,
    vat_id: input.vatId,
    country: input.country,
    address: input.address,
    locale: meta.locale,
    token_hash: hashToken(raw),
    expires_at: new Date(now.getTime() + SIGNUP_TOKEN_TTL_HOURS * 3_600_000).toISOString(),
    terms_version: TERMS_VERSION,
    consent_at: now.toISOString(),
    ip_hash: meta.ipHash,
    user_agent: meta.userAgent,
  });
  if (insertError) return { ok: false, error: "generic" };

  const url = `${base}/${meta.locale}/registracija/potrdi/${raw}`;
  // Development only, like the magic link: never put a live credential in the
  // production log stream.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] signup link for ${input.email}: ${url}`);
  }

  const html = renderEmail(
    t("emailTitle"),
    [t("emailGreeting", { name: input.fullName }), t("emailBody", { company: input.company }), t("emailExpiry")],
    t("emailCta"),
    url,
  );
  const sent = await sendEmail({
    to: input.email,
    kind: "signup_confirm",
    projectId: null,
    subject: t("emailSubject"),
    html,
  });
  return accepted(sent) ? { ok: true } : { ok: false, error: "emailFailed" };
}

/** Unconfirmed signups are somebody's personal data with no purpose left. */
export async function pruneStaleSignups(): Promise<void> {
  const cutoff = new Date(Date.now() - SIGNUP_PRUNE_DAYS * 86_400_000).toISOString();
  const db = createAdminClient();
  await db.from("signups").delete().is("consumed_at", null).lt("created_at", cutoff);
}

export type SignupConfirmView =
  | { state: "invalid" | "used" | "expired" }
  | {
      state: "ready";
      company: string;
      vatId: string | null;
      address: string | null;
      country: string;
      fullName: string;
      email: string;
    };

/** For the confirm page. Reads only: the GET must never consume the link. */
export async function loadSignupForConfirm(raw: string): Promise<SignupConfirmView> {
  if (!raw || raw.length > 128) return { state: "invalid" };
  const db = createAdminClient();
  const { data, error } = await db
    .from("signups")
    .select("company_name, vat_id, address, country, full_name, email, expires_at, consumed_at")
    .eq("token_hash", hashToken(raw))
    .maybeSingle();
  if (error || !data) return { state: "invalid" };

  const state = signupLinkState(data, new Date());
  if (state !== "ready") return { state };
  return {
    state: "ready",
    company: data.company_name,
    vatId: data.vat_id,
    address: data.address,
    country: data.country,
    fullName: data.full_name,
    email: data.email,
  };
}

/** Tells the founder, in Slovenian, the moment a company confirms. */
export async function notifyFounderOfSignup(orgId: string): Promise<void> {
  const to = process.env.FOUNDER_NOTIFY_EMAIL?.trim();
  if (!to) {
    console.error("FOUNDER_NOTIFY_EMAIL is not set: a new signup was not announced.");
    return;
  }
  const db = createAdminClient();
  const { data: org } = await db
    .from("organizations")
    .select("id, name, country, address, vat_id, contact_email, contact_phone, created_at")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return;

  const { data: admin } = await db
    .from("people")
    .select("full_name, email, phone")
    .eq("org_id", orgId)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  // Not refused, only flagged: two people from one company may sign up
  // separately, and the founder is the right judge of that.
  const { data: twins } = org.vat_id
    ? await db.from("organizations").select("name").eq("vat_id", org.vat_id).neq("id", orgId).limit(3)
    : { data: [] as { name: string }[] };

  const t = await getTranslations({ locale: "sl", namespace: "signup" });
  const when = fmtDateTime(org.created_at, "sl");
  const reply = admin?.email ?? org.contact_email ?? "";

  const lines = [
    t("founderCompany", { value: org.name }),
    t("founderVat", { value: org.vat_id ?? "" }),
    t("founderCountry", { value: (org.country ?? "").toUpperCase() }),
    t("founderAddress", { value: org.address ?? "" }),
    t("founderName", { value: admin?.full_name ?? "" }),
    t("founderEmail", { value: reply }),
    t("founderPhone", { value: admin?.phone || org.contact_phone || t("founderNoPhone") }),
    t("founderTime", { value: when }),
    ...(twins?.length ? [t("founderVatDuplicate", { value: twins.map((x) => x.name).join(", ") })] : []),
  ];

  const html = renderEmail(t("founderTitle"), lines, t("founderCta"), reply ? `mailto:${reply}` : (appBaseUrl() ?? ""));
  await sendEmail({
    to,
    kind: "signup_founder",
    projectId: null,
    subject: t("founderSubject", { company: org.name }),
    html,
  });
}
