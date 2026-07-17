import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { resolveActorFromToken } from "@/lib/actor";
import { getCrewHome } from "@/lib/data/reports";
import { getSiblingToken } from "@/lib/data/tokens";
import { CrewHome } from "@/components/crew/CrewHome";
import { EpcHome } from "@/components/epc/EpcHome";
import { DevSwapBar } from "@/components/dev/DevSwapBar";

// Thin role router: resolve the actor once, pick the view, render it with the
// dev swap bar. Both views build from the same getCrewHome data (one fetch).
export default async function ProjectTokenPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromToken(token);
  if (!actor) notFound();

  const data = await getCrewHome(actor);
  if (!data) notFound();

  const view =
    actor.role === "sub" ? (
      <CrewHome token={token} data={data} />
    ) : (
      <EpcHome token={token} data={data} />
    );

  const sibling = await getSiblingToken(actor);
  return (
    <>
      {view}
      {sibling && <DevSwapBar locale={locale} siblingToken={sibling.token} targetRole={sibling.role} />}
    </>
  );
}
