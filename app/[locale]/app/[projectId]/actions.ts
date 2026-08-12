"use server";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { resolveActorFromSession } from "@/lib/auth";
import { requireProjectActor, requireOfficeActor, type ProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import { canCreateInvite } from "@/lib/invites-shared";
import { createInvite } from "@/lib/data/invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, renderEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
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
  // submitMaterialCheck owns the fanout and the ping (it decides whether a
  // shortfall is worth notifying about), so there is no ping here.
  const checkId = await submitMaterialCheck(actor, payload);
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
  // submitDailyReport emits entry_submitted, which carries the ping.
  const entryId = await submitDailyReport(actor, payload);
  return { ok: true, entryId };
}

/**
 * Create an invitation for a subcontractor company and return the LINK.
 *
 * A link rather than only an email, because that is how this actually happens:
 * the EPC already has the sub in WhatsApp, and telling them to wait for an
 * email from an app they have never heard of is a worse first contact than
 * pasting a link into the thread they are already in. An email is sent as well
 * when an address is given, but the link works on its own.
 */
export async function createSubInviteLink(
  projectId: string,
  email: string | null,
  locale: string,
): Promise<
  { ok: true; url: string } | { ok: false; error: "forbidden" | "alreadyLinked" | "failed" }
> {
  if (!isUuid(projectId)) return { ok: false, error: "forbidden" };

  const actor = await resolveActorFromSession();
  if (!actor) return { ok: false, error: "forbidden" };

  let person;
  try {
    person = requireOfficeActor(actor);
  } catch {
    return { ok: false, error: "forbidden" };
  }
  if (!canCreateInvite(person.orgType, person.role, "sub_company")) {
    return { ok: false, error: "forbidden" };
  }

  const db = createAdminClient();
  const { data: project } = await db
    .from("projects")
    .select("id, name, epc_org_id, sub_org_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project || project.epc_org_id !== person.orgId) return { ok: false, error: "forbidden" };
  if (project.sub_org_id) return { ok: false, error: "alreadyLinked" };

  const base = appBaseUrl();
  if (!base) return { ok: false, error: "failed" };

  const { token } = await createInvite(person, {
    kind: "sub_company",
    email: email ?? "",
    projectId,
  });
  const url = `${base}/${locale}/invite/${token}`;

  if (email && email.includes("@")) {
    const { data: org } = await db
      .from("organizations")
      .select("name")
      .eq("id", person.orgId)
      .maybeSingle();

    const t = await getTranslations({ locale, namespace: "invite" });
    const html = renderEmail(
      t("title"),
      [t("body", { org: org?.name ?? "", project: project.name })],
      t("acceptCta"),
      url,
    );
    after(async () => {
      await sendEmail({ to: email, kind: "invite", projectId, subject: t("subject"), html });
    });
  }

  return { ok: true, url };
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
