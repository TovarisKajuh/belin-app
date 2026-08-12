"use server";
import { resolveActorFromSession } from "@/lib/auth";
import { requestFinalization } from "@/lib/data/projects";
import { generateCompletionReport } from "@/lib/data/final-report";
import { createAdminClient } from "@/lib/supabase/admin";

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

/**
 * Generate the completion report.
 *
 * Refuses a second run within a minute of the last one. Assembling nine days
 * of photographs is dozens of storage downloads, and a double click on weak
 * LTE would start the whole thing twice and store two documents that differ
 * only by their timestamp.
 */
export async function generateCompletionReportAction(
  projectId: string,
): Promise<{ ok: true; documentId: string }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");

  const db = createAdminClient();
  const { data: recent } = await db
    .from("generated_documents")
    .select("id, created_at")
    .eq("project_id", projectId)
    .eq("kind", "completion_report")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent && Date.now() - Date.parse(recent.created_at) < 60_000) {
    return { ok: true, documentId: recent.id };
  }

  const result = await generateCompletionReport(actor, projectId);
  return { ok: true, documentId: result.documentId };
}
