import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { newRawToken } from "@/lib/auth-core";
import { isUuid } from "@/lib/actor-shared";
import { INVITE_TTL_DAYS, type InviteKind } from "@/lib/invites-shared";
import type { PersonActor } from "@/lib/actor";

export interface InviteView {
  id: string;
  kind: InviteKind;
  email: string | null;
  orgId: string | null;
  orgName: string | null;
  projectId: string | null;
  projectName: string | null;
  invitedRole: string | null;
  /** True when the target project already has a subcontractor attached. */
  alreadyLinked: boolean;
}

export type AcceptResult =
  | { ok: true; personId: string }
  | { ok: false; reason: "invalid" | "alreadyLinked" | "emailTaken" };

function expiryIso(): string {
  return new Date(Date.now() + INVITE_TTL_DAYS * 86400000).toISOString();
}

/**
 * Mint an invite. The token is 32 bytes of CSPRNG entropy, the same minting
 * used for login links: this token is a credential, since whoever holds it can
 * create an account inside somebody's organization.
 */
export async function createInvite(
  actor: PersonActor,
  input: { kind: InviteKind; email: string; projectId?: string | null; invitedRole?: string | null },
): Promise<{ token: string }> {
  const db = createAdminClient();
  const token = newRawToken();

  const { error } = await db.from("invites").insert({
    kind: input.kind,
    token,
    email: input.email.trim().toLowerCase(),
    org_id: actor.orgId,
    project_id: input.projectId ?? null,
    invited_role: input.invitedRole ?? null,
    status: "pending",
    expires_at: expiryIso(),
    created_by_person: actor.personId,
  });
  if (error) throw new Error(`Could not create invite: ${error.message}`);

  return { token };
}

/** Read an invite for display. Never mutates: the GET must stay safe. */
export async function loadInvite(token: string): Promise<InviteView | null> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("invites")
    .select(
      "id, kind, email, org_id, project_id, invited_role, status, expires_at, organizations (name), projects (name, sub_org_id)",
    )
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  if (data.status !== "pending") return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;

  const project = data.projects as { name: string; sub_org_id: string | null } | null;

  return {
    id: data.id,
    kind: data.kind as InviteKind,
    email: data.email,
    orgId: data.org_id,
    orgName: (data.organizations as { name: string } | null)?.name ?? null,
    projectId: data.project_id,
    projectName: project?.name ?? null,
    invitedRole: data.invited_role,
    alreadyLinked: Boolean(project?.sub_org_id),
  };
}

/**
 * Accept an invite and become a person.
 *
 * Consumption is ONE conditional update: the pending-and-unexpired guard lives
 * in the WHERE clause, so two people opening the same invite at once cannot
 * both create an account from it. Everything after that point acts on a row
 * this call has already won.
 */
export async function acceptInvite(
  token: string,
  input: { orgName?: string; fullName: string; email: string },
): Promise<AcceptResult> {
  const db = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!email || !fullName) return { ok: false, reason: "invalid" };

  // Checked BEFORE consuming: an address that already has an account would hit
  // the unique index and surface as an unlocalized database error, and would
  // also burn the invite on the way there.
  const { data: existing } = await db
    .from("people")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existing) return { ok: false, reason: "emailTaken" };

  const view = await loadInvite(token);
  if (!view) return { ok: false, reason: "invalid" };
  if (view.kind === "sub_company" && view.alreadyLinked) {
    return { ok: false, reason: "alreadyLinked" };
  }

  const { data: claimed, error: claimError } = await db
    .from("invites")
    .update({ status: "accepted" })
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .select("id, kind, org_id, project_id, invited_role")
    .maybeSingle();

  if (claimError || !claimed) return { ok: false, reason: "invalid" };

  try {
    if (claimed.kind === "sub_company") {
      return await acceptAsSubCompany(claimed.project_id, input.orgName ?? "", fullName, email);
    }
    return await acceptAsMember(claimed.org_id, claimed.invited_role, fullName, email);
  } catch (err) {
    // The invite was already marked accepted above. Hand it back rather than
    // leaving a consumed invite that produced no account.
    await db.from("invites").update({ status: "pending" }).eq("id", claimed.id);
    throw err;
  }
}

async function acceptAsSubCompany(
  projectId: string | null,
  orgName: string,
  fullName: string,
  email: string,
): Promise<AcceptResult> {
  const db = createAdminClient();
  const name = orgName.trim();
  if (!name || !projectId || !isUuid(projectId)) return { ok: false, reason: "invalid" };

  const { data: project } = await db
    .from("projects")
    .select("id, country, sub_org_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { ok: false, reason: "invalid" };
  if (project.sub_org_id) return { ok: false, reason: "alreadyLinked" };

  const { data: org, error: orgError } = await db
    .from("organizations")
    .insert({ type: "sub", name, country: project.country })
    .select("id")
    .single();
  if (orgError || !org) throw new Error(orgError?.message ?? "Could not create organization.");

  const { data: person, error: personError } = await db
    .from("people")
    .insert({ org_id: org.id, full_name: fullName, email, role: "admin" })
    .select("id")
    .single();
  if (personError || !person) throw new Error(personError?.message ?? "Could not create person.");

  // Only attach while the slot is still empty, so a second acceptance racing
  // this one cannot overwrite the first subcontractor.
  const { data: linked } = await db
    .from("projects")
    .update({ sub_org_id: org.id })
    .eq("id", projectId)
    .is("sub_org_id", null)
    .select("id")
    .maybeSingle();
  if (!linked) return { ok: false, reason: "alreadyLinked" };

  return { ok: true, personId: person.id };
}

async function acceptAsMember(
  orgId: string | null,
  invitedRole: string | null,
  fullName: string,
  email: string,
): Promise<AcceptResult> {
  const db = createAdminClient();
  if (!orgId) return { ok: false, reason: "invalid" };

  const { data: person, error } = await db
    .from("people")
    .insert({
      org_id: orgId,
      full_name: fullName,
      email,
      role: invitedRole === "admin" ? "admin" : "bauleiter",
    })
    .select("id")
    .single();
  if (error || !person) throw new Error(error?.message ?? "Could not create person.");

  return { ok: true, personId: person.id };
}

/**
 * The crew link for a project: a shared project token with the sub role,
 * reused rather than reinvented, so the crew screen keeps working exactly as
 * it does today. Returns the existing live one when there is one, because a
 * fresh token each visit would silently invalidate the link already stuck on
 * somebody's phone.
 */
export async function ensureCrewLink(projectId: string): Promise<string> {
  const db = createAdminClient();

  const { data: existing } = await db
    .from("project_tokens")
    .select("token")
    .eq("project_id", projectId)
    .eq("role", "sub")
    .eq("revoked", false)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.token;

  const token = newRawToken();
  const { error } = await db
    .from("project_tokens")
    .insert({ project_id: projectId, role: "sub", token, label: "crew" });
  if (error) throw new Error(`Could not create crew link: ${error.message}`);

  return token;
}
