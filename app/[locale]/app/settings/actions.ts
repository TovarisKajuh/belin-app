"use server";

import { getTranslations } from "next-intl/server";
import { after } from "next/server";
import { resolveActorFromSession } from "@/lib/auth";
import { requireOfficeActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import { canCreateInvite, epcMemberRole, type InviteKind } from "@/lib/invites-shared";
import { createInvite } from "@/lib/data/invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, renderEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";
import { createVaultDocTarget } from "@/lib/storage";
import { extensionForMime, isVaultType } from "@/lib/vault-shared";
import type { NotifyKind } from "@/lib/notify-shared";
import {
  updateOrgSettings,
  setNotificationPref,
  addVaultDoc,
} from "@/lib/data/org-settings";

export type InviteState = { sent: boolean; error: "forbidden" | "invalid" | null };
export type OrgFormState = { saved: boolean; error: "forbidden" | "invalid" | null };
export type VaultState = { saved: boolean; error: "forbidden" | "invalid" | "type" | null };

/** The office gate every mutation on this page shares. */
async function officeActor() {
  const actor = await resolveActorFromSession();
  if (!actor) return null;
  try {
    return requireOfficeActor(actor);
  } catch {
    return null;
  }
}

export async function updateOrgAction(
  _prev: OrgFormState,
  formData: FormData,
): Promise<OrgFormState> {
  const person = await officeActor();
  if (!person) return { saved: false, error: "forbidden" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { saved: false, error: "invalid" };

  await updateOrgSettings(person, {
    name,
    address: String(formData.get("address") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    vatId: String(formData.get("vatId") ?? ""),
    iban: String(formData.get("iban") ?? ""),
    accountantEmail: String(formData.get("accountantEmail") ?? ""),
  });

  return { saved: true, error: null };
}

export async function setNotificationPrefAction(formData: FormData): Promise<void> {
  const person = await officeActor();
  if (!person) return;

  const kind = String(formData.get("kind") ?? "") as NotifyKind;
  const wanted = String(formData.get("wanted") ?? "") === "1";
  await setNotificationPref(person, kind, wanted);
}

/**
 * Mint a signed upload URL for a vault document.
 *
 * The extension is derived from the declared mime type through a whitelist,
 * never from the uploaded filename: a filename is attacker-controlled text, and
 * one carrying a second extension or a path separator has no business reaching
 * a storage path.
 */
export async function requestVaultUploadAction(
  mime: string,
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: "forbidden" | "type" }> {
  const person = await officeActor();
  if (!person) return { ok: false, error: "forbidden" };

  const extension = extensionForMime(mime);
  if (!extension) return { ok: false, error: "type" };

  const target = await createVaultDocTarget(person.orgId, extension);
  return { ok: true, path: target.path, token: target.token };
}

export async function addVaultDocAction(
  _prev: VaultState,
  formData: FormData,
): Promise<VaultState> {
  const person = await officeActor();
  if (!person) return { saved: false, error: "forbidden" };

  const type = String(formData.get("type") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");
  if (!isVaultType(type) || !storagePath) return { saved: false, error: "invalid" };

  await addVaultDoc(person, {
    type,
    title: String(formData.get("title") ?? ""),
    validFrom: String(formData.get("validFrom") ?? "") || null,
    validUntil: String(formData.get("validUntil") ?? "") || null,
    storagePath,
  });

  return { saved: true, error: null };
}

export async function createInviteAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const actor = await resolveActorFromSession();
  if (!actor) return { sent: false, error: "forbidden" };

  let person;
  try {
    person = requireOfficeActor(actor);
  } catch {
    return { sent: false, error: "forbidden" };
  }

  const kind = String(formData.get("kind") ?? "") as InviteKind;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const locale = String(formData.get("locale") ?? "sl");
  const projectId = String(formData.get("projectId") ?? "").trim();
  const role = String(formData.get("role") ?? "");

  if (!canCreateInvite(person.orgType, person.role, kind)) {
    return { sent: false, error: "forbidden" };
  }
  if (!email.includes("@")) return { sent: false, error: "invalid" };
  if (kind === "sub_company" && !isUuid(projectId)) return { sent: false, error: "invalid" };

  const db = createAdminClient();

  // The invited person must belong to the acting org's own project.
  let projectName: string | null = null;
  if (kind === "sub_company") {
    const { data: project } = await db
      .from("projects")
      .select("id, name, epc_org_id, sub_org_id")
      .eq("id", projectId)
      .maybeSingle();
    if (!project || project.epc_org_id !== person.orgId) {
      return { sent: false, error: "forbidden" };
    }
    if (project.sub_org_id) return { sent: false, error: "invalid" };
    projectName = project.name;
  }

  const { token } = await createInvite(person, {
    kind,
    email,
    projectId: kind === "sub_company" ? projectId : null,
    invitedRole: kind === "epc_member" ? epcMemberRole(role) : null,
  });

  const base = appBaseUrl();
  if (!base) return { sent: true, error: null };

  const { data: org } = await db
    .from("organizations")
    .select("name")
    .eq("id", person.orgId)
    .maybeSingle();

  const t = await getTranslations({ locale, namespace: "invite" });
  const html = renderEmail(
    t("title"),
    [t("body", { org: org?.name ?? "", project: projectName ?? "" })],
    t("acceptCta"),
    `${base}/${locale}/invite/${token}`,
  );

  after(async () => {
    await sendEmail({
      to: email,
      kind: "invite",
      projectId: kind === "sub_company" ? projectId : null,
      subject: t("subject"),
      html,
    });
  });

  return { sent: true, error: null };
}
