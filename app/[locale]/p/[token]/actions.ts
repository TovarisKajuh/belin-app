"use server";
import { resolveActorFromToken } from "@/lib/actor";
import { createPhotoUploadTargets, type UploadTarget } from "@/lib/storage";
import { submitDailyReport, type SubmitReportPayload } from "@/lib/data/reports";
import { updateProjectStatus } from "@/lib/data/projects";
import type { ProjectStatus } from "@/lib/project-status";

async function requireSubActor(token: string) {
  const actor = await resolveActorFromToken(token);
  if (!actor || actor.role !== "sub") throw new Error("Not authorized for this project.");
  return actor;
}

export async function requestPhotoTargets(
  token: string,
  entryClientId: string,
  count: number
): Promise<UploadTarget[]> {
  const actor = await requireSubActor(token);
  const safeCount = Math.max(0, Math.min(count, 12));
  return createPhotoUploadTargets(actor.projectId, entryClientId, safeCount);
}

export async function submitReport(
  token: string,
  payload: SubmitReportPayload
): Promise<{ ok: true; entryId: string }> {
  const actor = await requireSubActor(token);
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
  return updateProjectStatus(actor, newStatus);
}
