"use server";
import { resolveActorFromToken } from "@/lib/actor";
import { createPhotoUploadTargets, type UploadTarget } from "@/lib/storage";
import { submitDailyReport, type SubmitReportPayload } from "@/lib/data/reports";

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
