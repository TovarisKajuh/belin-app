import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { resolveActorFromToken } from "@/lib/actor";
import { resolveActorFromSession } from "@/lib/auth";
import { getCrewHome } from "@/lib/data/reports";
import { getEpcDashboard } from "@/lib/data/epc-dashboard";
import { getSiblingToken } from "@/lib/data/tokens";
import { CrewClaim } from "@/components/crew/CrewClaim";
import { EpcDashboard } from "@/components/epc/EpcDashboard";
import { DevSwapBar } from "@/components/dev/DevSwapBar";

// The project link, which is now two different doors depending on the side.
//
// The CREW link is no longer the app: it is how a phone joins the app, once.
// Crew work every day, so their daily surface has to be an installed icon that
// opens signed in, not a URL somebody has to keep finding. So this route asks
// who is holding the phone, mints a real session, and hands off to /app/[id],
// which is the same screen the crew have always used.
//
// The EPC link is untouched. It is a read-only wall dashboard, opened
// occasionally, often on a screen nobody is signed in on, and it has no daily
// ritual that a claim would improve.
export default async function ProjectTokenPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromToken(token);
  if (!actor) notFound();

  if (actor.role === "sub") {
    // Already claimed on this device, and belonging to this project's
    // subcontractor: go straight to work. This is what makes a bookmarked or
    // re-scanned link harmless rather than a second claim screen.
    const session = await resolveActorFromSession();
    if (
      session?.kind === "person" &&
      session.role === "crew" &&
      session.orgId === actor.orgId
    ) {
      redirect(`/${locale}/app/${actor.projectId}`);
    }

    const core = await getCrewHome(actor);
    if (!core) notFound();

    return <CrewClaim locale={locale} token={token} projectName={core.projectName} />;
  }

  const data = await getEpcDashboard(actor);
  if (!data) notFound();

  const sibling = await getSiblingToken(actor);
  return (
    <>
      <EpcDashboard token={token} projectId={actor.projectId} data={data} locale={locale} />
      {sibling && (
        <DevSwapBar
          locale={locale}
          siblingToken={sibling.token}
          targetRole={sibling.role}
          raised={false}
        />
      )}
    </>
  );
}
