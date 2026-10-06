import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import { getCrewHome } from "@/lib/data/reports";
import { getMaterialState } from "@/lib/data/materials";
import { getEpcDashboard } from "@/lib/data/epc-dashboard";
import { getSubWaiting } from "@/lib/data/sub-home";
import { ensureCrewLink } from "@/lib/data/invites";
import { canIssueCrewLink } from "@/lib/invites-shared";
import { CrewHome } from "@/components/crew/CrewHome";
import { EpcDashboard } from "@/components/epc/EpcDashboard";
import { SubHome } from "@/components/sub/SubHome";
import { AddSubPanel } from "@/components/project/AddSubPanel";
import { projectNeedsSub } from "@/lib/data/projects-list";
import { LogoutPill } from "@/components/auth/LogoutPill";

// One project, opened by a signed-in person. Same views as the link routes,
// except that identity is proven rather than presented, so no token is threaded
// into the components: they call the session actions instead.
//
// The role here comes from WHICH side of the project the person's organization
// sits on, not from their job title. The same admin is the EPC on one project
// and could be the subcontractor on the next.
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);

  const actor = await resolveActorFromSession();
  if (!actor) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/app/${projectId}`)}`);
  if (!isUuid(projectId)) notFound();

  let project;
  try {
    project = await requireProjectActor(actor, projectId);
  } catch {
    // Not a party to this project. Deliberately indistinguishable from a
    // project that does not exist: otherwise this page would answer "which
    // project ids are real" for anyone who asks.
    notFound();
  }

  // A crew person signing in would land on the roof reporting screen, which is
  // built for the shared crew link. Office people on the sub side get the
  // office view instead.
  const isCrewPerson = actor.kind === "person" && actor.role === "crew";

  if (project.role === "sub" && !isCrewPerson) {
    // The boss is often also the guy on the roof: most subcontractors in this
    // market are two to ten people. His dashboard is where he works, so the
    // daily-report screen must be one click from here, not a link he has to
    // dig out of Settings. Same rule as the Settings copy control decides who
    // gets the button.
    const mayOpenCrew =
      actor.kind === "person" && canIssueCrewLink(actor.orgType, actor.role);

    const [data, material, crewToken] = await Promise.all([
      getCrewHome(project),
      getMaterialState(project),
      mayOpenCrew ? ensureCrewLink(projectId) : Promise.resolve(null),
    ]);
    if (!data || !material) notFound();
    // Admin and owner accept the naročilnica and issue the invoice; for them
    // those cards are "Vaš korak", for anyone else they are waiting.
    const isOffice = actor.kind === "person" && (actor.role === "admin" || actor.role === "owner");
    const waiting = await getSubWaiting(project, data, isOffice);
    return (
      <>
        <SubHome
          locale={locale}
          projectId={projectId}
          data={data}
          material={material}
          crewToken={crewToken}
          waiting={waiting}
        />
        <LogoutPill locale={locale} />
      </>
    );
  }

  if (project.role === "sub") {
    const [data, material] = await Promise.all([
      getCrewHome(project),
      getMaterialState(project),
    ]);
    if (!data || !material) notFound();
    return (
      <>
        <CrewHome
          token={null}
          projectId={projectId}
          data={data}
          material={material}
          nav={{ locale, active: "report" }}
        />
        <LogoutPill locale={locale} raised />
      </>
    );
  }

  const data = await getEpcDashboard(project);
  if (!data) notFound();

  // A project with no subcontractor cannot receive a naročilnica and no crew
  // link resolves, so the gap is surfaced here where the EPC will see it,
  // rather than left to be discovered later from a settings page.
  const needsSub = await projectNeedsSub(projectId);

  return (
    <>
      {needsSub && (
        <div className="belin-dark">
          <div className="e-wrap">
            <AddSubPanel projectId={projectId} projectName={needsSub.name} locale={locale} />
          </div>
        </div>
      )}
      <EpcDashboard token={null} projectId={projectId} data={data} locale={locale} />
      <LogoutPill locale={locale} />
    </>
  );
}
