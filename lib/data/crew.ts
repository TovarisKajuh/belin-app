import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { canIssueCrewLink } from "@/lib/invites-shared";
import { matchRosterName, normalizeCrewName } from "@/lib/crew-shared";
import type { PersonActor } from "@/lib/actor";

// Crew identity.
//
// A crew member is a people row with role crew and no email: their credential
// is a device session claimed once through the project link. This reverses the
// 2026-07-20 rule that crew never gets accounts, because that rule assumed
// occasional use. Crew use this app every working day, and asking a roofer to
// find a browser link each morning was never going to survive a real site.
//
// The link now authenticates exactly one thing: the CLAIM. Holding it is what
// lets you say who you are, which is the same trust the anonymous link always
// extended to whoever held it. Every day after that, the session does the work,
// and the boss can revoke one person without breaking anything for the rest.

/** The claimable names for a project: its subcontractor's live crew. */
export async function listCrewRoster(
  projectId: string,
): Promise<{ id: string; fullName: string }[]> {
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select("sub_org_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project?.sub_org_id) return [];

  const { data } = await db
    .from("people")
    .select("id, full_name")
    .eq("org_id", project.sub_org_id)
    .eq("role", "crew")
    .is("disabled_at", null)
    .order("full_name");

  return (data ?? []).map((person) => ({ id: person.id, fullName: person.full_name }));
}

/**
 * Turns a held crew link into a person.
 *
 * An existing name is verified against the roster rather than trusted from the
 * form, so a disabled person cannot be claimed back into life by anyone who
 * kept the old id. A new name is normalized and checked against the roster
 * case-insensitively first, so the same man on a new phone does not become a
 * second entry.
 */
export async function claimCrewIdentity(
  rawToken: string,
  choice: { personId: string } | { newName: string },
): Promise<
  { ok: true; personId: string; projectId: string } | { ok: false; error: "invalid" | "name" }
> {
  const db = createAdminClient();

  const { data: tokenRow } = await db
    .from("project_tokens")
    .select("project_id, role, revoked")
    .eq("token", rawToken)
    .maybeSingle();

  // Only the crew link claims an identity. An EPC link is the client's own
  // door and must never mint a person in the subcontractor's company.
  if (!tokenRow || tokenRow.revoked || tokenRow.role !== "sub") {
    return { ok: false, error: "invalid" };
  }

  const roster = await listCrewRoster(tokenRow.project_id);

  if ("personId" in choice) {
    const hit = roster.find((entry) => entry.id === choice.personId);
    if (!hit) return { ok: false, error: "invalid" };
    return { ok: true, personId: hit.id, projectId: tokenRow.project_id };
  }

  const name = normalizeCrewName(choice.newName);
  if (!name) return { ok: false, error: "name" };

  const existing = matchRosterName(roster, name);
  if (existing) return { ok: true, personId: existing, projectId: tokenRow.project_id };

  const { data: project } = await db
    .from("projects")
    .select("sub_org_id")
    .eq("id", tokenRow.project_id)
    .maybeSingle();
  if (!project?.sub_org_id) return { ok: false, error: "invalid" };

  const { data: person, error } = await db
    .from("people")
    .insert({ org_id: project.sub_org_id, full_name: name, role: "crew" })
    .select("id")
    .single();
  if (error || !person) return { ok: false, error: "invalid" };

  return { ok: true, personId: person.id, projectId: tokenRow.project_id };
}

/** The boss's roster: every crew person of his own company, disabled included. */
export async function listOrgCrew(
  actor: PersonActor,
): Promise<{ id: string; fullName: string; disabledAt: string | null }[]> {
  if (!canIssueCrewLink(actor.orgType, actor.role)) throw new Error("Forbidden");

  const db = createAdminClient();
  const { data } = await db
    .from("people")
    .select("id, full_name, disabled_at")
    .eq("org_id", actor.orgId)
    .eq("role", "crew")
    .order("full_name");

  return (data ?? []).map((person) => ({
    id: person.id,
    fullName: person.full_name,
    disabledAt: person.disabled_at,
  }));
}

/**
 * Disable or restore one crew member.
 *
 * Disabling revokes their sessions in the same call, and that is the whole
 * point of this over a shared link: a man who leaves on Friday loses access on
 * Friday, on every device he has, without anybody else on the crew noticing.
 * The org and role are part of the update filter, so a crafted id cannot reach
 * into another company or disable an office person.
 */
export async function setCrewDisabled(
  actor: PersonActor,
  personId: string,
  disabled: boolean,
): Promise<void> {
  if (!canIssueCrewLink(actor.orgType, actor.role)) throw new Error("Forbidden");

  const db = createAdminClient();
  const { data: updated } = await db
    .from("people")
    .update({ disabled_at: disabled ? new Date().toISOString() : null })
    .eq("id", personId)
    .eq("org_id", actor.orgId)
    .eq("role", "crew")
    .select("id")
    .maybeSingle();
  if (!updated) throw new Error("Forbidden");

  if (disabled) {
    await db.from("sessions").update({ revoked: true }).eq("person_id", personId);
  }
}

/** Adds a crew member from the office, without anyone having to hold a link. */
export async function addCrewMember(
  actor: PersonActor,
  rawName: string,
): Promise<{ ok: true } | { ok: false; error: "forbidden" | "name" }> {
  if (!canIssueCrewLink(actor.orgType, actor.role)) return { ok: false, error: "forbidden" };

  const name = normalizeCrewName(rawName);
  if (!name) return { ok: false, error: "name" };

  const db = createAdminClient();
  const { data: existing } = await db
    .from("people")
    .select("id, full_name, disabled_at")
    .eq("org_id", actor.orgId)
    .eq("role", "crew");

  // Adding a name that is already there restores him instead of duplicating
  // him: the boss re-adding somebody he removed means he wants him back.
  const match = matchRosterName(
    (existing ?? []).map((p) => ({ id: p.id, fullName: p.full_name })),
    name,
  );
  if (match) {
    await db.from("people").update({ disabled_at: null }).eq("id", match);
    return { ok: true };
  }

  const { error } = await db
    .from("people")
    .insert({ org_id: actor.orgId, full_name: name, role: "crew" });
  if (error) return { ok: false, error: "forbidden" };
  return { ok: true };
}
