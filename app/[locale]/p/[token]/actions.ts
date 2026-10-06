"use server";
import { resolveActorFromToken } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import {
  createPhotoUploadTargets,
  createMaterialDocTargets,
  createIncidentPhotoTargets,
  createRequestPhotoTarget,
  type UploadTarget,
} from "@/lib/storage";
import { submitDailyReport, type SubmitReportPayload } from "@/lib/data/reports";
import {
  submitMaterialCheck,
  addMaterialItem,
  type SubmitMaterialCheckPayload,
} from "@/lib/data/materials";
import { updateProjectStatus } from "@/lib/data/projects";
import { createIncident, type IncidentPayload } from "@/lib/data/incidents";
import type { ActionResult } from "@/lib/action-result";
import { toResult } from "@/lib/action-result-server";
import {
  createRequest,
  listRequests,
  type CreateRequestPayload,
  type RequestRow,
} from "@/lib/data/requests";
import { notifyProject } from "@/lib/realtime-server";
import type { ProjectStatus } from "@/lib/project-status";

async function requireSubActor(token: string) {
  const actor = await resolveActorFromToken(token);
  if (!actor || actor.role !== "sub") throw new Error("Not authorized for this project.");
  return actor;
}

async function requireEpcActor(token: string) {
  const actor = await resolveActorFromToken(token);
  if (!actor || actor.role !== "epc") throw new Error("Not authorized for this project.");
  return actor;
}

export async function requestPhotoTargets(
  token: string,
  entryClientId: string,
  count: number
): Promise<UploadTarget[]> {
  const actor = await requireSubActor(token);
  if (!isUuid(entryClientId)) throw new Error("Invalid entry id");
  const safeCount = Math.max(0, Math.min(count, 12));
  return createPhotoUploadTargets(actor.projectId, entryClientId, safeCount);
}

export async function requestMaterialDocTargets(
  token: string,
  checkClientId: string,
  photoCount: number,
  noteCount: number
): Promise<{ photos: UploadTarget[]; notes: UploadTarget[] }> {
  const actor = await requireSubActor(token);
  if (!isUuid(checkClientId)) throw new Error("Invalid material check id");
  return createMaterialDocTargets(actor.projectId, checkClientId, photoCount, noteCount);
}

export async function submitMaterialCheckAction(
  token: string,
  payload: SubmitMaterialCheckPayload
): Promise<{ ok: true; checkId: string }> {
  const actor = await requireSubActor(token);
  // submitMaterialCheck owns the fanout and the ping (it decides whether a
  // shortfall is worth notifying about), so there is no ping here.
  const checkId = await submitMaterialCheck(actor, payload);
  return { ok: true, checkId };
}

export async function addMaterialItemAction(
  token: string,
  item: { name: string; qty: number; unit: string }
): Promise<{ ok: true }> {
  const actor = await requireEpcActor(token);
  await addMaterialItem(actor, item);
  await notifyProject(actor.projectId);
  return { ok: true };
}

export async function submitReport(
  token: string,
  payload: SubmitReportPayload
): Promise<{ ok: true; entryId: string }> {
  const actor = await requireSubActor(token);
  // submitDailyReport emits entry_submitted, which carries the ping.
  const entryId = await submitDailyReport(actor, payload);
  return { ok: true, entryId };
}

// Either party may call this; the legality of the move is enforced by role
// inside updateProjectStatus, so no role gate is needed here beyond a valid token.
export async function setProjectStatus(
  token: string,
  newStatus: ProjectStatus
): Promise<{ ok: boolean; status: ProjectStatus }> {
  const actor = await resolveActorFromToken(token);
  if (!actor) throw new Error("Not authorized for this project.");
  const result = await updateProjectStatus(actor, newStatus);
  if (result.ok) await notifyProject(actor.projectId);
  return result;
}

export async function requestIncidentPhotoTargets(
  token: string,
  incidentClientId: string,
  count: number
): Promise<UploadTarget[]> {
  const actor = await requireSubActor(token);
  if (!isUuid(incidentClientId)) throw new Error("Invalid incident id");
  return createIncidentPhotoTargets(actor.projectId, incidentClientId, count);
}

export async function createIncidentAction(
  token: string,
  payload: IncidentPayload,
): Promise<ActionResult<{ incidentId: string }>> {
  return toResult(async () => {
    const actor = await requireSubActor(token);
    return { incidentId: await createIncident(actor, payload) };
  });
}

export async function requestRequestPhotoTarget(
  token: string,
  requestClientId: string
): Promise<UploadTarget> {
  const actor = await requireSubActor(token);
  return createRequestPhotoTarget(actor.projectId, requestClientId);
}

export async function createRequestAction(
  token: string,
  payload: CreateRequestPayload,
): Promise<ActionResult<{ requestId: string }>> {
  return toResult(async () => {
    const actor = await requireSubActor(token);
    return { requestId: await createRequest(actor, payload) };
  });
}

export async function listRequestsAction(token: string): Promise<RequestRow[]> {
  const actor = await requireSubActor(token);
  return listRequests(actor);
}
