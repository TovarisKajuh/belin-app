import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { resolveActorFromToken } from "@/lib/actor";
import { getCrewHome } from "@/lib/data/reports";
import { getEpcDashboard } from "@/lib/data/epc-dashboard";
import { getSiblingToken } from "@/lib/data/tokens";
import { CrewHome } from "@/components/crew/CrewHome";
import { EpcDashboard } from "@/components/epc/EpcDashboard";
import { DevSwapBar } from "@/components/dev/DevSwapBar";

// Thin role router: resolve the actor once, then fetch and render the view its
// role needs. The sub gets the mobile crew screen; the EPC gets the dark
// dashboard. Each side has its own data read.
export default async function ProjectTokenPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromToken(token);
  if (!actor) notFound();

  let view;
  if (actor.role === "sub") {
    const data = await getCrewHome(actor);
    if (!data) notFound();
    view = <CrewHome token={token} data={data} />;
  } else {
    const data = await getEpcDashboard(actor);
    if (!data) notFound();
    view = <EpcDashboard token={token} data={data} />;
  }

  const sibling = await getSiblingToken(actor);
  return (
    <>
      {view}
      {sibling && <DevSwapBar locale={locale} siblingToken={sibling.token} targetRole={sibling.role} />}
    </>
  );
}
