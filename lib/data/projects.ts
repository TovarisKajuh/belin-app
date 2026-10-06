import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireOfficeActor,
  requireProjectActor,
  type Actor,
  type ProjectActor,
} from "@/lib/actor";
import { emitEventDeferred } from "@/lib/notify";
import { canTransition, asProjectStatus, type ProjectStatus } from "@/lib/project-status";

// Guarded status change with a compare-and-swap (audit finding H3): the update
// only lands if the status is still the one we validated the transition against,
// and the activity row is written only when the swap actually changed a row, so
// two devices racing cannot corrupt the status or leave a phantom audit entry.
export async function updateProjectStatus(
  actor: ProjectActor,
  newStatus: ProjectStatus
): Promise<{ ok: boolean; status: ProjectStatus }> {
  const db = createAdminClient();
  const { data: proj } = await db
    .from("projects")
    .select("status")
    .eq("id", actor.projectId)
    .maybeSingle();
  if (!proj) return { ok: false, status: "active" };

  const current = asProjectStatus(proj.status);
  if (!canTransition(actor.role, current, newStatus)) return { ok: false, status: current };

  const { data: updated, error } = await db
    .from("projects")
    .update({ status: newStatus })
    .eq("id", actor.projectId)
    .eq("status", current)
    .select("status")
    .maybeSingle();
  if (error || !updated) return { ok: false, status: current };

  await db.from("activity").insert({
    project_id: actor.projectId,
    kind: "project_updated",
    payload: { from: current, to: newStatus, by: actor.role },
  });
  return { ok: true, status: newStatus };
}

/**
 * The subcontractor declares the job finished and hands it over.
 *
 * This is its own action rather than a move on the shared status control
 * (founder decision, 2026-08-12). Two doors to the same state is one door too
 * many when only one of them tells the client it happened, and this is the act
 * that starts the acceptance: somebody is saying "we are done, come and look".
 *
 * Office only, on the sub side. A crew link can withdraw a request, because
 * undoing your own mistake binds nobody, but declaring completion is the
 * company speaking, not the person on the roof today.
 */
export async function requestFinalization(
  actor: Actor,
  projectId: string,
): Promise<{ requestedAt: string }> {
  const projectActor = await requireProjectActor(actor, projectId);
  const person = requireOfficeActor(actor);
  if (projectActor.role !== "sub") {
    throw new Error("Forbidden: the contractor requests the handover.");
  }

  // One conditional update from active. A second click, or a second person in
  // the office clicking at the same moment, changes nothing and says so.
  const { data, error } = await createAdminClient()
    .from("projects")
    .update({ status: "reviewing" })
    .eq("id", projectId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error("final.conflict");
  const requestedAt = new Date().toISOString();

  await emitEventDeferred({
    projectId,
    kind: "finalization_requested",
    actorPerson: person.personId,
    payload: {},
  });
  // The activity row is written after the response, so the page refreshed
  // right after the click cannot read the date yet: it shows this one.
  return { requestedAt };
}
