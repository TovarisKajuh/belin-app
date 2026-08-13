import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { resolveActorFromSession, sessionToken, sessionScenario } from "@/lib/auth";
import { getCrewHome } from "@/lib/data/reports";
import { getMaterialState } from "@/lib/data/materials";
import { getEpcDashboard } from "@/lib/data/epc-dashboard";
import { getSiblingToken } from "@/lib/data/tokens";
import { CrewHome } from "@/components/crew/CrewHome";
import { EpcDashboard } from "@/components/epc/EpcDashboard";
import { DevSwapBar } from "@/components/dev/DevSwapBar";
import { LogoutPill } from "@/components/auth/LogoutPill";
import { ProjectList } from "@/components/app/ProjectList";
import { CrewProjectPicker } from "@/components/crew/CrewProjectPicker";
import { listProjectsForPerson } from "@/lib/data/projects-list";
import { ScenarioPill } from "@/components/auth/ScenarioPill";

// The signed-in view. Same role router as /p/[token], except identity comes
// from the session cookie instead of the URL. The token still reaches the view
// components as a prop because their server actions take it; removing that
// last hop is the remainder of the transport refactor and belongs with
// magic-link auth in phase 3.
export default async function AppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromSession();
  // Not signed in: go to the login form, carrying where they were headed so
  // the emailed link lands on the page they actually wanted.
  if (!actor) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/app`)}`);

  // A person session lands here after the magic link: their projects, on
  // whichever side of each one their organization stands.
  if (actor.kind === "person") {
    const projects = await listProjectsForPerson(actor);

    // A roofer does not have a portfolio, he has today's site. One project
    // opens itself, which is the whole experience for most crew: tap the icon,
    // you are on your job. Several ask which roof and nothing more.
    if (actor.role === "crew") {
      if (projects.length === 1) redirect(`/${locale}/app/${projects[0].id}`);
      return (
        <>
          <CrewProjectPicker locale={locale} projects={projects} />
          <LogoutPill locale={locale} />
        </>
      );
    }

    return (
      <>
        <ProjectList locale={locale} actor={actor} projects={projects} />
        <LogoutPill locale={locale} />
      </>
    );
  }

  const token = await sessionToken();
  if (!token) redirect(`/${locale}`);

  // Start the token-independent reads so they overlap the main view fetch
  // instead of running after it.
  const siblingPromise = getSiblingToken(actor);
  const scenarioPromise = sessionScenario();

  let view;
  if (actor.role === "sub") {
    const [data, material] = await Promise.all([getCrewHome(actor), getMaterialState(actor)]);
    if (!data || !material) notFound();
    view = <CrewHome token={token} projectId={actor.projectId} data={data} material={material} />;
  } else {
    const data = await getEpcDashboard(actor);
    if (!data) notFound();
    view = <EpcDashboard token={token} projectId={actor.projectId} data={data} locale={locale} />;
  }

  // The crew screen has a fixed submit bar along the bottom, so both pills lift
  // clear of it there.
  const raised = actor.role === "sub";
  const [sibling, scenario] = await Promise.all([siblingPromise, scenarioPromise]);
  return (
    <>
      {view}
      {scenario && <ScenarioPill locale={locale} scenario={scenario} raised={raised} />}
      <LogoutPill locale={locale} raised={raised} />
      {sibling && (
        <DevSwapBar
          locale={locale}
          siblingToken={sibling.token}
          targetRole={sibling.role}
          raised={raised}
        />
      )}
    </>
  );
}
