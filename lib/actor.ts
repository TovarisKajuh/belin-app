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

export type Actor = TokenActor;

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

  void db
    .from("project_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);

  return { kind: "token", role, projectId: data.project_id, orgId, tokenId: data.id };
}
