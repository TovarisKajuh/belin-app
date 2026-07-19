"use server";

import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import {
  tokenForCredentials,
  startSession,
  endSession,
  sessionToken,
  otherScenarioToken,
} from "@/lib/auth";

export type LoginState = { error: "invalid" | null };

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
  await endSession();
  redirect(`/${locale}`);
}
