import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveActorFromSession } from "@/lib/auth";
import { requireOfficeActor, type OrgActor } from "@/lib/actor";
import { listKnownSubs } from "@/lib/data/plan-imports";
import { orgCountry } from "@/lib/data/orgs";
import { Wizard } from "@/components/wizard/Wizard";
import { HeaderSession } from "@/components/app/HeaderSession";

// The plan first project wizard. Step one is the K2 upload, deliberately:
// design law 2 says the EPC reviews instead of types, so the very first thing
// the app asks for is the file that already holds the answers.
export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await resolveActorFromSession();
  let actor: OrgActor | null = null;
  if (session?.kind === "token" && session.role === "epc") {
    actor = session;
  } else if (session?.kind === "person") {
    try {
      const person = requireOfficeActor(session, { allowBauleiter: true });
      if (person.orgType === "epc") actor = person;
    } catch {
      actor = null;
    }
  }
  if (!actor) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/app/new`)}`);
  }

  const [subs, country] = await Promise.all([listKnownSubs(actor), orgCountry(actor.orgId)]);

  return (
    <Wizard
      locale={locale}
      subs={subs}
      defaultCountry={country ?? "si"}
      session={<HeaderSession locale={locale} />}
    />
  );
}
