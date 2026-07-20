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

export type InviteState = { sent: boolean; error: "forbidden" | "invalid" | null };

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
