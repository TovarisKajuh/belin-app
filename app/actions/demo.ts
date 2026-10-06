"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveActorFromSession } from "@/lib/auth";
import { DEMO_SESSION_TTL_MS } from "@/lib/demo/door";
import { parseSwitchablePersona, personaForPersonId, safeDemoLocale, switchTarget } from "@/lib/demo/personas";
import { hasPresenterCookie, startDemoPersonaSession } from "@/lib/demo/session";

/**
 * The presenter changes role. Two proofs, both required: the signed belin-demo
 * cookie (only the door mints it) and a current session that IS a demo
 * persona, so a stale cookie can never replace a real account's session.
 */
export async function switchPersonaAction(formData: FormData): Promise<void> {
  const locale = safeDemoLocale(formData.get("locale"));
  const persona = parseSwitchablePersona(formData.get("persona"));
  const path = String(formData.get("path") ?? "");
  if (!persona || !(await hasPresenterCookie())) redirect(`/${locale}/app`);

  const actor = await resolveActorFromSession();
  const current = actor?.kind === "person" ? personaForPersonId(actor.personId) : null;
  if (!current || current === "guest") redirect(`/${locale}/app`);

  const result = await startDemoPersonaSession(persona, { ttlMs: DEMO_SESSION_TTL_MS, presenter: true });
  if (result !== "ok") redirect(`/${locale}/app`);

  // The switch itself lives in the /app layout, which a plain redirect would
  // not re-render: it would keep showing the previous role.
  revalidatePath(`/${locale}/app`, "layout");
  redirect(switchTarget(locale, path, persona));
}
