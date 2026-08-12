"use server";
import { resolveActorFromSession } from "@/lib/auth";
import { requestFinalization } from "@/lib/data/projects";

// Finalization actions. Session only, all of them: everything on this screen
// either hands a job over, signs for it, or bills it.

export async function requestFinalizationAction(
  projectId: string,
): Promise<{ ok: true }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
  await requestFinalization(actor, projectId);
  return { ok: true };
}
