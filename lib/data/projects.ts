import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/actor";
import { canTransition, asProjectStatus, type ProjectStatus } from "@/lib/project-status";

// Guarded status change with a compare-and-swap (audit finding H3): the update
// only lands if the status is still the one we validated the transition against,
// and the activity row is written only when the swap actually changed a row, so
// two devices racing cannot corrupt the status or leave a phantom audit entry.
export async function updateProjectStatus(
  actor: Actor,
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
