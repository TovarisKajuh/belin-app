import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/actor";
import { projectProgress } from "@/lib/progress";
import { canTransition, type ProjectStatus } from "@/lib/project-status";

export interface ScopeItemSummary {
  id: string;
  name: string;
  unit: string;
  targetQty: number;
  weight: number;
  installedQty: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  kwp: number | null;
  moduleCount: number | null;
  progressPercent: number;
  scopeItems: ScopeItemSummary[];
}

// Every data function takes the Actor and scopes queries to the
// actor's project. Authorization lives here, not in page code.
export async function getProjectSummary(actor: Actor): Promise<ProjectSummary | null> {
  const db = createAdminClient();

  const [projectRes, scopeRes, quantitiesRes] = await Promise.all([
    db
      .from("projects")
      .select("id, name, status, address_street, address_zip, address_city, kwp, module_count")
      .eq("id", actor.projectId)
      .maybeSingle(),
    db
      .from("scope_items")
      .select("id, name, unit, target_qty, weight, sort_order")
      .eq("project_id", actor.projectId)
      .order("sort_order"),
    db
      .from("entry_quantities")
      .select("scope_item_id, qty, daily_entries!inner (project_id)")
      .eq("daily_entries.project_id", actor.projectId),
  ]);

  if (projectRes.error || !projectRes.data) return null;
  if (scopeRes.error || quantitiesRes.error) return null;

  const installedByItem = new Map<string, number>();
  for (const row of quantitiesRes.data) {
    installedByItem.set(
      row.scope_item_id,
      (installedByItem.get(row.scope_item_id) ?? 0) + Number(row.qty)
    );
  }

  const scopeItems: ScopeItemSummary[] = scopeRes.data.map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.unit,
    targetQty: Number(s.target_qty),
    weight: Number(s.weight),
    installedQty: installedByItem.get(s.id) ?? 0,
  }));

  return {
    id: projectRes.data.id,
    name: projectRes.data.name,
    status: projectRes.data.status as ProjectStatus,
    addressStreet: projectRes.data.address_street,
    addressZip: projectRes.data.address_zip,
    addressCity: projectRes.data.address_city,
    kwp: projectRes.data.kwp === null ? null : Number(projectRes.data.kwp),
    moduleCount: projectRes.data.module_count,
    progressPercent: projectProgress(scopeItems),
    scopeItems,
  };
}

// Guarded status change: the transition must be legal for the acting party.
// Enforced here as well as in the UI, so an illegal move fails server-side.
export async function updateProjectStatus(
  actor: Actor,
  newStatus: ProjectStatus
): Promise<{ ok: boolean; status: ProjectStatus }> {
  const db = createAdminClient();
  const { data: proj } = await db
    .from("projects")
    .select("status")
    .eq("id", actor.projectId)
    .maybeSingle();
  if (!proj) return { ok: false, status: "active" };

  const current = proj.status as ProjectStatus;
  if (!canTransition(actor.role, current, newStatus)) return { ok: false, status: current };

  const { error } = await db.from("projects").update({ status: newStatus }).eq("id", actor.projectId);
  if (error) return { ok: false, status: current };

  await db.from("activity").insert({
    project_id: actor.projectId,
    kind: "project_updated",
    payload: { from: current, to: newStatus, by: actor.role },
  });
  return { ok: true, status: newStatus };
}
