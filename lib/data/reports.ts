import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Actor } from "@/lib/actor";
import type { Json } from "@/lib/database.types";
import { projectProgress } from "@/lib/progress";
import { fetchWeatherSnapshot } from "@/lib/weather";
import { getSignedPhotoUrlMap } from "@/lib/storage";
import { summarizeTodayPosts, type TodayPost } from "@/lib/reports-shared";
import type { ProjectStatus } from "@/lib/project-status";

export type { TodayPost } from "@/lib/reports-shared";

export interface CrewScopeStatus {
  id: string;
  name: string;
  unit: string;
  targetQty: number;
  installedQty: number;
}
export interface CrewHomeData {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  progressPercent: number;
  scope: CrewScopeStatus[];
  todayDate: string;
  todayPosts: TodayPost[];
}
export interface SubmitReportPayload {
  clientGeneratedId: string;
  entryDate: string;
  note: string;
  headcount: number;
  quantities: { scopeItemId: string; qty: number }[];
  photoPaths: string[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getCrewHome(actor: Actor): Promise<CrewHomeData | null> {
  const db = createAdminClient();
  const today = todayIso();

  const [projectRes, scopeRes, qtyRes, todayEntriesRes] = await Promise.all([
    db
      .from("projects")
      .select("id, name, status, address_street, address_zip, address_city")
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
    db
      .from("daily_entries")
      .select("id, note, headcount, created_at")
      .eq("project_id", actor.projectId)
      .eq("entry_date", today)
      .order("created_at", { ascending: false }),
  ]);

  if (projectRes.error || !projectRes.data) return null;
  if (scopeRes.error || qtyRes.error || todayEntriesRes.error) return null;

  const installedByItem = new Map<string, number>();
  for (const row of qtyRes.data) {
    installedByItem.set(
      row.scope_item_id,
      (installedByItem.get(row.scope_item_id) ?? 0) + Number(row.qty)
    );
  }

  const scope: CrewScopeStatus[] = scopeRes.data.map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.unit,
    targetQty: Number(s.target_qty),
    installedQty: installedByItem.get(s.id) ?? 0,
  }));

  const progressPercent = projectProgress(
    scopeRes.data.map((s) => ({
      targetQty: Number(s.target_qty),
      weight: Number(s.weight),
      installedQty: installedByItem.get(s.id) ?? 0,
    }))
  );

  // Per-entry quantities and photo counts for today's posts only.
  const todayEntryIds = todayEntriesRes.data.map((e) => e.id);
  const scopeById: Record<string, { name: string; unit: string }> = {};
  for (const s of scopeRes.data) scopeById[s.id] = { name: s.name, unit: s.unit };

  const quantitiesByEntry: Record<string, { scope_item_id: string; qty: number }[]> = {};
  const photoUrlsByEntry: Record<string, string[]> = {};
  if (todayEntryIds.length > 0) {
    const [eqRes, epRes] = await Promise.all([
      db.from("entry_quantities").select("entry_id, scope_item_id, qty").in("entry_id", todayEntryIds),
      db
        .from("entry_photos")
        .select("entry_id, storage_path, sort_order")
        .in("entry_id", todayEntryIds)
        .order("sort_order"),
    ]);
    for (const row of eqRes.data ?? []) {
      (quantitiesByEntry[row.entry_id] ??= []).push({
        scope_item_id: row.scope_item_id,
        qty: Number(row.qty),
      });
    }
    const photoRows = epRes.data ?? [];
    const urlByPath = await getSignedPhotoUrlMap(photoRows.map((r) => r.storage_path));
    for (const row of photoRows) {
      const url = urlByPath[row.storage_path];
      if (url) (photoUrlsByEntry[row.entry_id] ??= []).push(url);
    }
  }

  const todayPosts = summarizeTodayPosts(
    todayEntriesRes.data,
    quantitiesByEntry,
    photoUrlsByEntry,
    scopeById
  );

  return {
    projectId: projectRes.data.id,
    projectName: projectRes.data.name,
    status: projectRes.data.status as ProjectStatus,
    addressStreet: projectRes.data.address_street,
    addressZip: projectRes.data.address_zip,
    addressCity: projectRes.data.address_city,
    progressPercent,
    scope,
    todayDate: today,
    todayPosts,
  };
}

export async function submitDailyReport(actor: Actor, payload: SubmitReportPayload): Promise<string> {
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select("lat, lng")
    .eq("id", actor.projectId)
    .maybeSingle();
  const weather = await fetchWeatherSnapshot(project?.lat ?? null, project?.lng ?? null);

  // Idempotent on client_generated_id: a retried submit returns the same row.
  const { data: entry, error: entryErr } = await db
    .from("daily_entries")
    .upsert(
      {
        project_id: actor.projectId,
        entry_date: payload.entryDate,
        note: payload.note.trim() === "" ? null : payload.note.trim(),
        headcount: payload.headcount,
        weather: weather ? ({ ...weather } as Json) : null,
        client_generated_id: payload.clientGeneratedId,
      },
      { onConflict: "client_generated_id" }
    )
    .select("id")
    .single();
  if (entryErr || !entry) throw new Error("Could not save the report");

  const nonZero = payload.quantities.filter((q) => q.qty > 0);
  if (nonZero.length > 0) {
    const { error } = await db.from("entry_quantities").upsert(
      nonZero.map((q) => ({ entry_id: entry.id, scope_item_id: q.scopeItemId, qty: q.qty })),
      { onConflict: "entry_id,scope_item_id" }
    );
    if (error) throw new Error("Could not save quantities");
  }

  if (payload.photoPaths.length > 0) {
    const { error } = await db.from("entry_photos").insert(
      payload.photoPaths.map((p, i) => ({ entry_id: entry.id, storage_path: p, sort_order: i }))
    );
    if (error) throw new Error("Could not save photos");
  }

  await db.from("activity").insert({
    project_id: actor.projectId,
    kind: "entry_submitted",
    payload: { headcount: payload.headcount, photos: payload.photoPaths.length },
  });

  return entry.id;
}
