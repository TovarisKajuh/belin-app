import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlausibleToken, resolveProjectRole } from "@/lib/actor-shared";

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
  // Always null: a link is a shared secret, not a person. Present so a
  // TokenActor satisfies ProjectActor structurally, which is what lets every
  // existing token call site keep working untouched.
  personId: null;
};

// A signed-in human, resolved from a person session rather than from a link.
export type PersonActor = {
  kind: "person";
  personId: string;
  orgId: string;
  orgType: "epc" | "sub";
  role: "admin" | "bauleiter" | "owner" | "crew";
  fullName: string;
  email: string | null;
};

export type Actor = TokenActor | PersonActor;

/** What a session cookie can resolve to: a project link, or a person. */
export type SessionActor = Actor;

/**
 * An actor already proven to belong to one specific project, which is what
 * every data function actually needs. A TokenActor satisfies this shape
 * structurally, so the existing call sites did not change meaning when they
 * moved from Actor to ProjectActor: they only became honest about the
 * precondition they always relied on.
 */
export type ProjectActor = {
  role: "epc" | "sub";
  projectId: string;
  orgId: string;
  personId: string | null;
};

/**
 * An actor scoped to an organization but not to any one project. This is what
 * the project wizard needs: at upload and review time the project does not
 * exist yet, so there is nothing to scope to except the org creating it. Both
 * actor kinds satisfy it structurally.
 */
export type OrgActor = {
  orgId: string;
  personId: string | null;
};

/**
 * The project gate. Resolves an actor against one project and throws if they
 * have no part in it. This is the ONLY place a person is granted access to a
 * project, so there is one rule to audit rather than one per surface.
 */
export async function requireProjectActor(
  actor: Actor,
  projectId: string,
): Promise<ProjectActor> {
  if (actor.kind === "token") {
    if (actor.projectId !== projectId) throw new Error("Forbidden: wrong project.");
    return {
      role: actor.role,
      projectId: actor.projectId,
      orgId: actor.orgId,
      personId: null,
    };
  }

  const db = createAdminClient();
  const { data: project, error } = await db
    .from("projects")
    .select("id, epc_org_id, sub_org_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) throw new Error("Forbidden: no such project.");

  const role = resolveProjectRole(actor, project);
  if (!role) throw new Error("Forbidden: not a party to this project.");

  return { role, projectId: project.id, orgId: actor.orgId, personId: actor.personId };
}

/**
 * The office gate, for acts that form a contract or move money: org settings
 * (IBAN, VAT id, accountant address), invites, sending and accepting a
 * naročilnica, requesting finalization, signing an acceptance, generating and
 * sharing an invoice.
 *
 * These are PERSON ONLY by design. A project link is a shared secret that can
 * be forwarded to anyone, so it must never be able to accept a price. Requiring
 * a named authenticated person is also what makes the acceptance record worth
 * anything: the acceptor's name is real and was proven at the time.
 *
 * A Bauleiter is deliberately excluded here. Where a flow genuinely belongs to
 * them, the caller passes allowBauleiter explicitly.
 */
export function requireOfficeActor(
  actor: Actor,
  options: { allowBauleiter?: boolean } = {},
): PersonActor {
  if (actor.kind !== "person") throw new Error("Forbidden: office account required.");

  const allowed = options.allowBauleiter
    ? ["admin", "owner", "bauleiter"]
    : ["admin", "owner"];

  if (!allowed.includes(actor.role)) throw new Error("Forbidden: insufficient role.");
  return actor;
}

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

  return {
    kind: "token",
    role,
    projectId: data.project_id,
    orgId,
    tokenId: data.id,
    personId: null,
  };
}
