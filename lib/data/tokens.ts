import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectActor } from "@/lib/actor";
import { isShotMode } from "@/lib/shot-mode";

// Development only: find the other party's active token for the same project so one
// person can swap between the connected EPC and sub views while building.
//
// This hands the caller a capability, not a convenience. A crew link is meant to
// be forwarded freely to whoever is on the roof that morning, and the token it
// returns opens the CLIENT's side of the same project. Ungated, every holder of
// a crew link could step into the EPC dashboard.
//
// So the gate lives here rather than at the two render sites: a page that
// forgets it would ship the hole again, while a data function that refuses
// cannot be misused. Development only: Next sets NODE_ENV to "production" in
// every build, so no deployed environment can switch this on with a variable.
// (It used to follow DEMO_LOGIN, retired with the password login on 2026-10-06.)
export async function getSiblingToken(
  actor: ProjectActor
): Promise<{ token: string; role: "epc" | "sub" } | null> {
  if (process.env.NODE_ENV !== "development") return null;
  // And never in a product shot, where it would float over the corner.
  if (await isShotMode()) return null;

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
