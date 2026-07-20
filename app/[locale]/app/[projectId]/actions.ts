"use server";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor, type ProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import {
  createPhotoUploadTargets,
  createMaterialDocTargets,
  type UploadTarget,
} from "@/lib/storage";
import { submitDailyReport, type SubmitReportPayload } from "@/lib/data/reports";
import {
  submitMaterialCheck,
  addMaterialItem,
  type SubmitMaterialCheckPayload,
} from "@/lib/data/materials";
import { updateProjectStatus } from "@/lib/data/projects";
import { notifyProject } from "@/lib/realtime-server";
import type { ProjectStatus } from "@/lib/project-status";

// The session twin of app/[locale]/p/[token]/actions.ts.
//
// Same names, same payloads, same order of arguments, except that the first one
// is the project id instead of a link token. That symmetry is deliberate: a
// client component holds one (token, projectId) pair and picks the family, so
// no component grows a second code path for the work itself.
//
// The token file is untouched. Two small gates that read differently are far
// easier to audit than one gate that tries to understand both worlds.

async function actorFor(projectId: string): Promise<ProjectActor> {
  if (!isUuid(projectId)) throw new Error("Invalid project id");
  const actor = await resolveActorFromSession();
  if (!actor) throw new Error("Not signed in.");
  return requireProjectActor(actor, projectId);
}

async function requireSubActor(projectId: string): Promise<ProjectActor> {
  const actor = await actorFor(projectId);
  if (actor.role !== "sub") throw new Error("Not authorized for this project.");
  return actor;
}

async function requireEpcActor(projectId: string): Promise<ProjectActor> {
  const actor = await actorFor(projectId);
  if (actor.role !== "epc") throw new Error("Not authorized for this project.");
  return actor;
}

export async function requestPhotoTargets(
  projectId: string,
  entryClientId: string,
  count: number,
): Promise<UploadTarget[]> {
  const actor = await requireSubActor(projectId);
  if (!isUuid(entryClientId)) throw new Error("Invalid entry id");
  const safeCount = Math.max(0, Math.min(count, 12));
  return createPhotoUploadTargets(actor.projectId, entryClientId, safeCount);
}

export async function requestMaterialDocTargets(
  projectId: string,
  checkClientId: string,
  photoCount: number,
  noteCount: number,
): Promise<{ photos: UploadTarget[]; notes: UploadTarget[] }> {
  const actor = await requireSubActor(projectId);
  if (!isUuid(checkClientId)) throw new Error("Invalid material check id");
  return createMaterialDocTargets(actor.projectId, checkClientId, photoCount, noteCount);
}

export async function submitMaterialCheckAction(
  projectId: string,
  payload: SubmitMaterialCheckPayload,
): Promise<{ ok: true; checkId: string }> {
  const actor = await requireSubActor(projectId);
  const checkId = await submitMaterialCheck(actor, payload);
  await notifyProject(actor.projectId);
  return { ok: true, checkId };
}

export async function addMaterialItemAction(
  projectId: string,
  item: { name: string; qty: number; unit: string },
): Promise<{ ok: true }> {
  const actor = await requireEpcActor(projectId);
  await addMaterialItem(actor, item);
  await notifyProject(actor.projectId);
  return { ok: true };
}

export async function submitReport(
  projectId: string,
  payload: SubmitReportPayload,
): Promise<{ ok: true; entryId: string }> {
  const actor = await requireSubActor(projectId);
  const entryId = await submitDailyReport(actor, payload);
  await notifyProject(actor.projectId);
  return { ok: true, entryId };
}

// Either party may call this; which moves are legal is decided by role inside
// updateProjectStatus, so membership of the project is the whole gate here.
export async function setProjectStatus(
  projectId: string,
  newStatus: ProjectStatus,
): Promise<{ ok: boolean; status: ProjectStatus }> {
  const actor = await actorFor(projectId);
  const result = await updateProjectStatus(actor, newStatus);
  if (result.ok) await notifyProject(actor.projectId);
  return result;
}
