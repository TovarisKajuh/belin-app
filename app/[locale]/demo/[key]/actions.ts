"use server";

import { redirect } from "next/navigation";
import { doorOpen, DEMO_SESSION_TTL_MS } from "@/lib/demo/door";
import { landingPath, parseEntryTarget, parseSwitchablePersona, safeDemoLocale } from "@/lib/demo/personas";
import { startDemoPersonaSession } from "@/lib/demo/session";

/**
 * One tap on the presenter panel. A server action is a public POST endpoint
 * anyone can call with any body, so the key is checked again here rather than
 * trusted from the page that rendered the button. A bad key learns nothing: it
 * lands on the home page.
 */
export async function enterAsAction(formData: FormData): Promise<void> {
  const locale = safeDemoLocale(formData.get("locale"));
  const key = formData.get("key");
  if (!doorOpen(key)) redirect(`/${locale}`);

  const panel = `/${locale}/demo/${encodeURIComponent(String(key))}`;
  const persona = parseSwitchablePersona(formData.get("persona"));
  if (!persona) redirect(panel);
  const target = parseEntryTarget(formData.get("project"), persona);
  if (!target) redirect(panel);

  const result = await startDemoPersonaSession(persona, { ttlMs: DEMO_SESSION_TTL_MS, presenter: true });
  if (result !== "ok") redirect(`${panel}?napaka=${result}`);

  // redirect throws: it stays outside any try/catch.
  redirect(landingPath(locale, target));
}
