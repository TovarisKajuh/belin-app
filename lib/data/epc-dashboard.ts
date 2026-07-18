import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/actor";
import { getProjectCore, type ProjectCore, type ScopeItemStatus } from "@/lib/data/project-core";
import { getSignedPhotoUrlMap } from "@/lib/storage";
import { weatherCodeToKey } from "@/lib/weather-codes";
import { projectProgress } from "@/lib/progress";
import { computeProjection, type Projection, type DailyProgressPoint } from "@/lib/projection-shared";

export interface DashboardQuantity {
  name: string;
  qty: number;
  unit: string;
}

export interface DashboardDay {
  entryId: string;
  date: string;
  headcount: number | null;
  note: string | null;
  weatherKey: string | null;
  tempC: number | null;
  quantities: DashboardQuantity[];
  photoUrls: string[];
}

export interface DashboardPhoto {
  url: string;
  date: string;
}

export interface DashboardActivity {
  kind: string;
  at: string;
  payload: Record<string, unknown>;
}

export interface EpcDashboardData {
  core: ProjectCore;
  progressPercent: number;
  scope: ScopeItemStatus[];
  days: DashboardDay[];
  latest: DashboardDay | null;
  gallery: DashboardPhoto[];
  activity: DashboardActivity[];
  projection: Projection;
  reportCount: number;
  photoCount: number;
  needsReview: boolean;
}

// The single dashboard read. Composes the shared project core (header, scope,
// weighted progress, planned dates, site-local day) with the full day-by-day
// log, the site photo set (signed in one cached batch), the recent activity,
// and a projection computed from the cumulative-progress history. Realtime and
// the material-check gate are separate, later chunks.
export async function getEpcDashboard(actor: Actor): Promise<EpcDashboardData | null> {
  const core = await getProjectCore(actor);
  if (!core) return null;

  const db = createAdminClient();

  const [entriesRes, qtyRes, photoRes, activityRes] = await Promise.all([
    db
      .from("daily_entries")
      .select("id, entry_date, headcount, note, weather, created_at")
      .eq("project_id", actor.projectId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    db
      .from("entry_quantities")
      .select("entry_id, scope_item_id, qty, daily_entries!inner (project_id)")
      .eq("daily_entries.project_id", actor.projectId),
    db
      .from("entry_photos")
      .select("entry_id, storage_path, sort_order, daily_entries!inner (project_id)")
      .eq("daily_entries.project_id", actor.projectId)
      .order("sort_order"),
    db
      .from("activity")
      .select("kind, payload, created_at")
      .eq("project_id", actor.projectId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (entriesRes.error || qtyRes.error || photoRes.error || activityRes.error) return null;

  const entries = entriesRes.data ?? [];
  const scopeById = new Map(core.scope.map((s) => [s.id, s]));

  // Quantities per entry: display rows (name/unit resolved) and raw rows (for history).
  const displayQtyByEntry: Record<string, DashboardQuantity[]> = {};
  const rawQtyByEntry: Record<string, { scopeItemId: string; qty: number }[]> = {};
  for (const row of qtyRes.data ?? []) {
    const qty = Number(row.qty);
    (rawQtyByEntry[row.entry_id] ??= []).push({ scopeItemId: row.scope_item_id, qty });
    const s = scopeById.get(row.scope_item_id);
    if (s) (displayQtyByEntry[row.entry_id] ??= []).push({ name: s.name, qty, unit: s.unit });
  }

  // Photos: sign every path in one cached batch, then group by entry (query order).
  const photoRows = photoRes.data ?? [];
  const urlByPath = await getSignedPhotoUrlMap(photoRows.map((r) => r.storage_path));
  const photosByEntry: Record<string, string[]> = {};
  for (const row of photoRows) {
    const url = urlByPath[row.storage_path];
    if (url) (photosByEntry[row.entry_id] ??= []).push(url);
  }

  // Days, newest first (already ordered).
  const days: DashboardDay[] = entries.map((e) => {
    const w = (e.weather ?? null) as { code?: number | null; tempC?: number | null } | null;
    return {
      entryId: e.id,
      date: e.entry_date,
      headcount: e.headcount,
      note: e.note,
      weatherKey: w ? weatherCodeToKey(w.code ?? null) : null,
      tempC: w?.tempC ?? null,
      quantities: displayQtyByEntry[e.id] ?? [],
      photoUrls: photosByEntry[e.id] ?? [],
    };
  });

  // Gallery: every photo, newest day first.
  const gallery: DashboardPhoto[] = [];
  for (const day of days) {
    for (const url of day.photoUrls) gallery.push({ url, date: day.date });
  }

  // Cumulative weighted-progress per date, oldest to newest, for the projection.
  const installed: Record<string, number> = {};
  const pointByDate = new Map<string, number>();
  for (const e of [...entries].reverse()) {
    for (const q of rawQtyByEntry[e.id] ?? []) {
      installed[q.scopeItemId] = (installed[q.scopeItemId] ?? 0) + q.qty;
    }
    const pct = projectProgress(
      core.scope.map((s) => ({
        targetQty: s.targetQty,
        weight: s.weight,
        installedQty: installed[s.id] ?? 0,
      }))
    );
    pointByDate.set(e.entry_date, pct);
  }
  const history: DailyProgressPoint[] = [...pointByDate.entries()].map(
    ([date, cumulativePercent]) => ({ date, cumulativePercent })
  );

  const projection = computeProjection({
    history,
    currentPercent: core.progressPercent,
    today: core.today,
    plannedStart: core.plannedStart,
    plannedEnd: core.plannedEnd,
  });

  const activity: DashboardActivity[] = (activityRes.data ?? []).map((a) => ({
    kind: a.kind,
    at: a.created_at,
    payload: (a.payload ?? {}) as Record<string, unknown>,
  }));

  return {
    core,
    progressPercent: core.progressPercent,
    scope: core.scope,
    days,
    latest: days[0] ?? null,
    gallery,
    activity,
    projection,
    reportCount: entries.length,
    photoCount: photoRows.length,
    needsReview: core.status === "reviewing",
  };
}
