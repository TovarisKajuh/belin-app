import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/actor";
import type { Json } from "@/lib/database.types";
import { fetchWeatherSnapshot } from "@/lib/weather";
import { projectToday } from "@/lib/project-time";
import { getSignedPhotoUrlMap } from "@/lib/storage";
import { summarizeTodayPosts, type TodayPost } from "@/lib/reports-shared";
import { getProjectCore, type ScopeItemStatus } from "@/lib/data/project-core";
import type { ProjectStatus } from "@/lib/project-status";

export type { TodayPost } from "@/lib/reports-shared";
export type { ScopeItemStatus } from "@/lib/data/project-core";

export interface CrewHomeData {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  progressPercent: number;
  scope: ScopeItemStatus[];
  todayDate: string;
  todayPosts: TodayPost[];
}

// entryDate is no longer accepted from the client; the server computes the
// site-local day (audit findings H1, M1).
export interface SubmitReportPayload {
  clientGeneratedId: string;
  note: string;
  headcount: number;
  quantities: { scopeItemId: string; qty: number }[];
  photoPaths: string[];
}

export async function getCrewHome(actor: Actor): Promise<CrewHomeData | null> {
  const core = await getProjectCore(actor);
  if (!core) return null;

  const db = createAdminClient();
  const today = core.today;

  // Today's entries, quantities and photos are all keyed by (project, date),
  // known from core, so they run in one parallel batch (audit finding M9).
  const [entriesRes, qtyRes, photoRes] = await Promise.all([
    db
      .from("daily_entries")
      .select("id, note, headcount, created_at")
      .eq("project_id", actor.projectId)
      .eq("entry_date", today)
      .order("created_at", { ascending: false }),
    db
      .from("entry_quantities")
      .select("entry_id, scope_item_id, qty, daily_entries!inner (project_id, entry_date)")
      .eq("daily_entries.project_id", actor.projectId)
      .eq("daily_entries.entry_date", today),
    db
      .from("entry_photos")
      .select("entry_id, storage_path, sort_order, daily_entries!inner (project_id, entry_date)")
      .eq("daily_entries.project_id", actor.projectId)
      .eq("daily_entries.entry_date", today)
      .order("sort_order"),
  ]);

  if (entriesRes.error || qtyRes.error || photoRes.error) return null;

  const scopeById: Record<string, { name: string; unit: string }> = {};
  for (const s of core.scope) scopeById[s.id] = { name: s.name, unit: s.unit };

  const quantitiesByEntry: Record<string, { scope_item_id: string; qty: number }[]> = {};
  for (const row of qtyRes.data ?? []) {
    (quantitiesByEntry[row.entry_id] ??= []).push({
      scope_item_id: row.scope_item_id,
      qty: Number(row.qty),
    });
  }

  const photoRows = photoRes.data ?? [];
  const urlByPath = await getSignedPhotoUrlMap(photoRows.map((r) => r.storage_path));
  const photoUrlsByEntry: Record<string, string[]> = {};
  for (const row of photoRows) {
    const url = urlByPath[row.storage_path];
    if (url) (photoUrlsByEntry[row.entry_id] ??= []).push(url);
  }

  const todayPosts = summarizeTodayPosts(
    entriesRes.data,
    quantitiesByEntry,
    photoUrlsByEntry,
    scopeById
  );

  return {
    projectId: core.id,
    projectName: core.name,
    status: core.status,
    addressStreet: core.addressStreet,
    addressZip: core.addressZip,
    addressCity: core.addressCity,
    progressPercent: core.progressPercent,
    scope: core.scope,
    todayDate: today,
    todayPosts,
  };
}

// One atomic, validated database transaction (audit findings H1, H2, H4, H5, M1, M12):
// weather is bounded by a timeout, the day is server-computed, and the RPC
// validates scope-item and photo-path ownership before writing entry, quantities,
// photos and activity together, idempotent on the client-generated id.
export async function submitDailyReport(actor: Actor, payload: SubmitReportPayload): Promise<string> {
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select("lat, lng, country")
    .eq("id", actor.projectId)
    .maybeSingle();

  const weather = await fetchWeatherSnapshot(project?.lat ?? null, project?.lng ?? null);
  const entryDate = projectToday(project?.country ?? null);

  const { data, error } = await db.rpc("submit_daily_report", {
    p_project: actor.projectId,
    p_entry_date: entryDate,
    p_note: payload.note,
    p_headcount: payload.headcount,
    p_weather: (weather ? { ...weather } : null) as Json,
    p_client_id: payload.clientGeneratedId,
    p_quantities: payload.quantities.map((q) => ({
      scope_item_id: q.scopeItemId,
      qty: q.qty,
    })) as unknown as Json,
    p_photo_paths: payload.photoPaths,
  });

  if (error || !data) throw new Error("Could not save the report");
  return data;
}
