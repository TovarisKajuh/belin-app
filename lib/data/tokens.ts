import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/actor";

// Dev-only: find the other party's active token for the same project so one
// person can swap between the connected EPC and sub views while building.
export async function getSiblingToken(
  actor: Actor
): Promise<{ token: string; role: "epc" | "sub" } | null> {
  const otherRole = actor.role === "epc" ? "sub" : "epc";
  const db = createAdminClient();
  const { data } = await db
    .from("project_tokens")
    .select("token")
    .eq("project_id", actor.projectId)
    .eq("role", otherRole)
    .eq("revoked", false)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { token: data.token, role: otherRole };
}
