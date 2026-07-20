import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { resolveActorFromToken } from "@/lib/actor";
import { getCrewHome } from "@/lib/data/reports";
import { getMaterialState } from "@/lib/data/materials";
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

  // Start the sibling lookup so it overlaps the main view fetch.
  const siblingPromise = getSiblingToken(actor);

  let view;
  if (actor.role === "sub") {
    const [data, material] = await Promise.all([getCrewHome(actor), getMaterialState(actor)]);
    if (!data || !material) notFound();
    view = <CrewHome token={token} data={data} material={material} />;
  } else {
    const data = await getEpcDashboard(actor);
    if (!data) notFound();
    view = <EpcDashboard token={token} data={data} locale={locale} />;
  }

  const sibling = await siblingPromise;
  return (
    <>
      {view}
      {sibling && (
        <DevSwapBar
          locale={locale}
          siblingToken={sibling.token}
          targetRole={sibling.role}
          raised={actor.role === "sub"}
        />
      )}
    </>
  );
}
