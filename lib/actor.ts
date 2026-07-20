import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlausibleToken } from "@/lib/actor-shared";

// The actor abstraction (DECISIONS.md 2026-07-17 evening): every data
// access resolves "who is acting" into an Actor first. Until M1 the
// only source is a project token; M1 adds a session-based actor behind
// the same type, and module code never notices the difference.

export type TokenActor = {
  kind: "token";
  role: "epc" | "sub";
  projectId: string;
  orgId: string;
  tokenId: string;
};

// A signed-in human, resolved from a person session rather than from a link.
// Kept OUT of the Actor union on purpose for now: every lib/data function takes
// Actor and reads projectId and role off it, and widening the union here would
// force that whole rename in this task. Task B4 does that deliberately, with
// requireProjectActor as the seam. Until then a PersonActor only carries
// identity, which is all the login flow needs.
export type PersonActor = {
  kind: "person";
  personId: string;
  orgId: string;
  orgType: "epc" | "sub";
  role: "admin" | "bauleiter" | "owner" | "crew";
  fullName: string;
  email: string | null;
};

export type Actor = TokenActor;

/** What a session cookie can resolve to today: a project link, or a person. */
export type SessionActor = TokenActor | PersonActor;

export async function resolvePersonActor(personId: string): Promise<PersonActor | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("people")
    .select("id, org_id, full_name, email, role, organizations (type)")
    .eq("id", personId)
    .maybeSingle();

  if (error || !data || !data.organizations) return null;

  const orgType = data.organizations.type as "epc" | "sub";
  if (orgType !== "epc" && orgType !== "sub") return null;

  return {
    kind: "person",
    personId: data.id,
    orgId: data.org_id,
    orgType,
    role: data.role as PersonActor["role"],
    fullName: data.full_name,
    email: data.email,
  };
}

export async function resolveActorFromToken(token: string): Promise<TokenActor | null> {
  if (!isPlausibleToken(token)) return null;

  const db = createAdminClient();
  const { data, error } = await db
    .from("project_tokens")
    .select("id, role, project_id, revoked, projects (epc_org_id, sub_org_id)")
    .eq("token", token)
    .maybeSingle();

  if (error || !data || data.revoked || !data.projects) return null;

  const role = data.role as "epc" | "sub";
  const orgId = role === "epc" ? data.projects.epc_org_id : data.projects.sub_org_id;
  if (!orgId) return null;

  // Note: last_used_at is intentionally not updated here. A fire-and-forget
  // write is unreliable in a serverless runtime (the function can freeze before
  // it lands) and adds a write to every read; when it is actually needed it will
  // be done reliably (audit finding L1).

  return { kind: "token", role, projectId: data.project_id, orgId, tokenId: data.id };
}
