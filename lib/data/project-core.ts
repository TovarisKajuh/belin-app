import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectActor } from "@/lib/actor";
import { projectProgress } from "@/lib/progress";
import { projectToday } from "@/lib/project-time";
import { asProjectStatus, type ProjectStatus } from "@/lib/project-status";

// One scope-item shape for the whole app (audit finding M4): id, unit, target,
// weight, and the cumulative installed quantity.
export interface ScopeItemStatus {
  id: string;
  name: string;
  unit: string;
  targetQty: number;
  weight: number;
  installedQty: number;
}

// The shared project core every screen and module needs: header, scope with
// installed quantities, computed weighted progress, and the site-local day.
// Both getProjectSummary and getCrewHome compose this (audit findings H6, M2, M3).
export interface ProjectCore {
  id: string;
  name: string;
  status: ProjectStatus;
  country: string;
  language: string;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  lat: number | null;
  lng: number | null;
  kwp: number | null;
  moduleCount: number | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  subName: string | null;
  progressPercent: number;
  scope: ScopeItemStatus[];
  today: string;
}

export async function getProjectCore(actor: ProjectActor): Promise<ProjectCore | null> {
  const db = createAdminClient();

  const [projectRes, scopeRes, installedRes] = await Promise.all([
    db
      .from("projects")
      .select(
        "id, name, status, country, language, address_street, address_zip, address_city, lat, lng, kwp, module_count, planned_start, planned_end, sub_org:organizations!projects_sub_org_id_fkey (name)"
      )
      .eq("id", actor.projectId)
      .maybeSingle(),
    db
      .from("scope_items")
      .select("id, name, unit, target_qty, weight, sort_order")
      .eq("project_id", actor.projectId)
      .order("sort_order"),
    // Grouped in Postgres: one row per scope item, not the whole history.
    db.rpc("scope_installed", { p_project: actor.projectId }),
  ]);

  if (projectRes.error || !projectRes.data) return null;
  if (scopeRes.error || installedRes.error) return null;

  const installedByItem = new Map<string, number>();
  for (const row of installedRes.data ?? []) {
    installedByItem.set(row.scope_item_id, Number(row.installed));
  }

  const scope: ScopeItemStatus[] = scopeRes.data.map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.unit,
    targetQty: Number(s.target_qty),
    weight: Number(s.weight),
    installedQty: installedByItem.get(s.id) ?? 0,
  }));

  const p = projectRes.data;
  // The sub-org embed is to-one; supabase may type it as an object or a
  // single-element array, so narrow defensively.
  const subEmbed: unknown = p.sub_org ?? null;
  const subName = Array.isArray(subEmbed)
    ? ((subEmbed[0] as { name?: string })?.name ?? null)
    : ((subEmbed as { name?: string } | null)?.name ?? null);

  return {
    id: p.id,
    name: p.name,
    status: asProjectStatus(p.status),
    country: p.country,
    language: p.language,
    addressStreet: p.address_street,
    addressZip: p.address_zip,
    addressCity: p.address_city,
    lat: p.lat,
    lng: p.lng,
    kwp: p.kwp === null ? null : Number(p.kwp),
    moduleCount: p.module_count,
    plannedStart: p.planned_start,
    plannedEnd: p.planned_end,
    subName,
    progressPercent: projectProgress(scope),
    scope,
    today: projectToday(p.country),
  };
}
