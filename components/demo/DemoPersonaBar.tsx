import { getTranslations } from "next-intl/server";
import { resolveActorFromSession } from "@/lib/auth";
import { isShotMode } from "@/lib/shot-mode";
import { hasPresenterCookie } from "@/lib/demo/session";
import { DEMO_PERSONAS, PERSONA_ROLE_KEY, SWITCHABLE_PERSONAS, personaForPersonId } from "@/lib/demo/personas";
import { DemoPersonaSwitch } from "./DemoPersonaSwitch";

// Shown only to a presenter who came through the Demo Door. The cheapest test
// runs first and needs no database: without the signed cookie this returns
// before anything else, so no real customer ever pays for this component.
export async function DemoPersonaBar({ locale }: { locale: string }) {
  if (!(await hasPresenterCookie())) return null;
  if (await isShotMode()) return null;

  const actor = await resolveActorFromSession();
  const current = actor?.kind === "person" ? personaForPersonId(actor.personId) : null;
  if (!current || current === "guest") return null;

  const t = await getTranslations("demo");
  return (
    <DemoPersonaSwitch
      locale={locale}
      current={current}
      switchLabel={t("switchLabel")}
      options={SWITCHABLE_PERSONAS.map((persona) => ({
        persona,
        role: t(PERSONA_ROLE_KEY[persona]),
        name: DEMO_PERSONAS[persona].name,
      }))}
    />
  );
}
