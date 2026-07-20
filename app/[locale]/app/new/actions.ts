"use server";
import { resolveActorFromSession } from "@/lib/auth";
import {
  createProjectFromReview,
  uploadAndParsePlan,
  type PlanUpload,
  type PlanUploadError,
  type ReviewPayload,
} from "@/lib/data/plan-imports";
import { requireOfficeActor, type OrgActor } from "@/lib/actor";

/**
 * The office gate, now that accounts exist.
 *
 * A Bauleiter IS allowed here: creating a project from a plan is site
 * preparation, not a contract, and the person who has the K2 export in their
 * hand is usually the one running the site. The link-token path stays for the
 * demo surfaces until Task J4 removes them.
 */
async function requireEpcActor(): Promise<OrgActor | null> {
  const actor = await resolveActorFromSession();
  if (!actor) return null;

  if (actor.kind === "token") return actor.role === "epc" ? actor : null;

  try {
    const person = requireOfficeActor(actor, { allowBauleiter: true });
    return person.orgType === "epc" ? person : null;
  } catch {
    return null;
  }
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
