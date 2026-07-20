"use server";

import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { acceptInvite } from "@/lib/data/invites";
import { startPersonSession } from "@/lib/auth";

export type AcceptState = {
  error: "invalid" | "alreadyLinked" | "emailTaken" | null;
};

function safeLocale(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  return (routing.locales as readonly string[]).includes(raw) ? raw : routing.defaultLocale;
}

/**
 * Accept an invitation. POST only, for the same reason the login confirm is:
 * mail scanners open every link in an email before the human does, and a GET
 * that consumed the invite would greet the real recipient with "expired".
 */
export async function acceptInviteAction(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const token = String(formData.get("token") ?? "");
  const locale = safeLocale(formData.get("locale"));
  const orgName = String(formData.get("orgName") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const email = String(formData.get("email") ?? "");

  if (!token) return { error: "invalid" };

  const result = await acceptInvite(token, { orgName, fullName, email });
  if (!result.ok) return { error: result.reason };

  await startPersonSession(result.personId);
  // redirect throws, so it stays outside any try/catch.
  redirect(`/${locale}/app`);
}
