"use server";
import { resolveTokenActorFromSession } from "@/lib/auth";
import {
  createProjectFromReview,
  uploadAndParsePlan,
  type PlanUpload,
  type PlanUploadError,
  type ReviewPayload,
} from "@/lib/data/plan-imports";
import type { Actor } from "@/lib/actor";

// The office gate. Today identity comes from the demo session cookie and the
// only office role is epc; when accounts land (master plan Part B) this is the
// ONE function that becomes requireOfficeActor, and nothing else here changes.
async function requireEpcActor(): Promise<Actor | null> {
  const actor = await resolveTokenActorFromSession();
  if (!actor || actor.role !== "epc") return null;
  return actor;
}

export type UploadActionResult =
  | { ok: true; upload: PlanUpload }
  | { ok: false; error: PlanUploadError | "forbidden" };

export async function uploadPlanAction(formData: FormData): Promise<UploadActionResult> {
  const actor = await requireEpcActor();
  if (!actor) return { ok: false, error: "forbidden" };

  const file = formData.get("plan");
  const locale = String(formData.get("locale") ?? "sl");
  const fallbackCountry = String(formData.get("country") ?? "si");

  if (!(file instanceof File)) return { ok: false, error: "bad_type" };

  // The cap is re-checked on the received bytes inside uploadAndParsePlan; this
  // is only the cheap first refusal.
  const bytes = new Uint8Array(await file.arrayBuffer());

  return uploadAndParsePlan(
    actor,
    { bytes, name: file.name, mime: file.type },
    { fallbackCountry, locale },
  );
}

export async function createProjectAction(
  payload: ReviewPayload,
): Promise<{ ok: true; projectId: string; epcToken: string } | { ok: false }> {
  const actor = await requireEpcActor();
  if (!actor) return { ok: false };

  return createProjectFromReview(actor, payload);
}
