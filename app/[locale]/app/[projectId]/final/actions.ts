"use server";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor } from "@/lib/actor";
import { requestFinalization } from "@/lib/data/projects";
import { generateCompletionReport } from "@/lib/data/final-report";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  addDefect,
  removeDefect,
  saveAcceptanceStep,
  saveSignature,
  signAcceptance,
  startAcceptance,
} from "@/lib/data/acceptances";
import type { AcceptanceStepPayload } from "@/lib/acceptance-view";
import { generateInvoice, shareToAccountant } from "@/lib/data/invoices";

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
  // Membership first: the reuse below must never hand a document id of
  // somebody else's project to a signed-in stranger (flows M10).
  await requireProjectActor(actor, projectId);

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

// The acceptance. Every step writes immediately, because this is conducted on
// a roof with one device passed between two people: a flow that saved only at
// the end would lose a completed inspection to a dropped connection.

export async function startAcceptanceAction(
  projectId: string,
  kind: "final" | "partial",
): Promise<{ ok: true; acceptanceId: string }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
  const acceptanceId = await startAcceptance(actor, projectId, kind);
  return { ok: true, acceptanceId };
}

export async function saveAcceptanceStepAction(
  projectId: string,
  acceptanceId: string,
  payload: AcceptanceStepPayload,
): Promise<{ ok: true }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
  await saveAcceptanceStep(actor, projectId, acceptanceId, payload);
  return { ok: true };
}

export async function addDefectAction(
  projectId: string,
  acceptanceId: string,
  payload: { description: string; dueDate: string | null; agreement: "agreed" | "disputed" },
): Promise<{ ok: true }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
  await addDefect(actor, projectId, acceptanceId, payload);
  return { ok: true };
}

export async function removeDefectAction(
  projectId: string,
  defectId: string,
): Promise<{ ok: true }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
  await removeDefect(actor, projectId, defectId);
  return { ok: true };
}

/** The PNG arrives base64 encoded: a server action cannot take a Blob. */
export async function saveSignatureAction(
  projectId: string,
  acceptanceId: string,
  side: "epc" | "sub",
  pngBase64: string,
): Promise<{ ok: true }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
  const bytes = Buffer.from(pngBase64, "base64");
  await saveSignature(actor, projectId, acceptanceId, side, bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer);
  return { ok: true };
}

export async function signAcceptanceAction(
  projectId: string,
  acceptanceId: string,
): Promise<{ ok: true }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
  await signAcceptance(actor, projectId, acceptanceId);
  return { ok: true };
}

// The invoice. Office only on the subcontractor side: this is the document
// that asks to be paid.

export async function generateInvoiceAction(
  projectId: string,
): Promise<{ ok: true; warnings: string[] }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
  const result = await generateInvoice(actor, projectId);
  return { ok: true, warnings: result.warnings };
}

export async function shareInvoiceAction(
  projectId: string,
  invoiceId: string,
): Promise<{ ok: true }> {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
  await shareToAccountant(actor, projectId, invoiceId);
  return { ok: true };
}
