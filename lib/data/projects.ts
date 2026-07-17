import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/actor";
import { projectProgress } from "@/lib/progress";

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
  status: string;
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
    status: projectRes.data.status,
    addressStreet: projectRes.data.address_street,
    addressZip: projectRes.data.address_zip,
    addressCity: projectRes.data.address_city,
    kwp: projectRes.data.kwp === null ? null : Number(projectRes.data.kwp),
    moduleCount: projectRes.data.module_count,
    progressPercent: projectProgress(scopeItems),
    scopeItems,
  };
}
