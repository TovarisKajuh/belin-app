import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { resolveActorFromSession, sessionToken } from "@/lib/auth";
import { getCrewHome } from "@/lib/data/reports";
import { getEpcDashboard } from "@/lib/data/epc-dashboard";
import { getSiblingToken } from "@/lib/data/tokens";
import { CrewHome } from "@/components/crew/CrewHome";
import { EpcDashboard } from "@/components/epc/EpcDashboard";
import { DevSwapBar } from "@/components/dev/DevSwapBar";
import { LogoutPill } from "@/components/auth/LogoutPill";

// The signed-in view. Same role router as /p/[token], except identity comes
// from the session cookie instead of the URL. The token still reaches the view
// components as a prop because their server actions take it; removing that
// last hop is the remainder of the transport refactor and belongs with
// magic-link auth in phase 3.
export default async function AppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromSession();
  if (!actor) redirect(`/${locale}`);

  const token = await sessionToken();
  if (!token) redirect(`/${locale}`);

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
      <LogoutPill locale={locale} />
      {sibling && <DevSwapBar locale={locale} siblingToken={sibling.token} targetRole={sibling.role} />}
    </>
  );
}
