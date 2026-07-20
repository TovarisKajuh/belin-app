import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { resolveTokenActorFromSession } from "@/lib/auth";
import { listKnownSubs } from "@/lib/data/plan-imports";
import { orgCountry } from "@/lib/data/orgs";
import { Wizard } from "@/components/wizard/Wizard";

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

  const actor = await resolveTokenActorFromSession();
  if (!actor || actor.role !== "epc") {
    redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/app/new`)}`);
  }

  const [subs, country] = await Promise.all([listKnownSubs(actor), orgCountry(actor.orgId)]);

  return <Wizard locale={locale} subs={subs} defaultCountry={country ?? "si"} />;
}
