import "server-only";
import { notFound, redirect } from "next/navigation";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import { rethrowIfUnavailable } from "@/lib/db-error";
import { getCrewHome } from "@/lib/data/reports";
import { getMaterialState } from "@/lib/data/materials";

/**
 * The shared door for the roof tabs.
 *
 * The project page's own guard is a long branch that decides between four
 * different views. The tab routes need exactly the sub-side slice of it, and
 * copying that branch into each new route is how two of the three eventually
 * stop agreeing about who may see what. So it lives here once.
 *
 * It refuses in the same three ways the project page does, deliberately: sign
 * in when there is no session, 404 for a project this actor is not a party to
 * (indistinguishable from one that does not exist), and a redirect back to the
 * project for the EPC, whose dashboard already carries this information.
 */
export async function requireCrewSurface(locale: string, projectId: string) {
  const actor = await resolveActorFromSession();
  if (!actor) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/app/${projectId}`)}`);
  }
  if (!isUuid(projectId)) notFound();

  let project;
  try {
    project = await requireProjectActor(actor, projectId);
  } catch (err) {
    rethrowIfUnavailable(err);
    notFound();
  }

  // The tabs belong to the CREW surface, not to the sub side in general.
  //
  // The EPC has these facts on its own dashboard. The subcontractor's office
  // has SubHome, and giving him the bar would make its Poročaj tab land him on
  // that office view, which is not a report form: a tab that does not go where
  // it says, and a bar that then disappears. He reaches the roof screen through
  // his own "Dnevno poročanje" button, which opens the untabbed crew link.
  const isCrewPerson = actor.kind === "person" && actor.role === "crew";
  if (project.role !== "sub" || !isCrewPerson) redirect(`/${locale}/app/${projectId}`);

  const [data, material] = await Promise.all([getCrewHome(project), getMaterialState(project)]);
  if (!data || !material) notFound();

  return { actor, project, data, material };
}
