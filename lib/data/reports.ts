import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectActor } from "@/lib/actor";
import type { Json } from "@/lib/database.types";
import { fetchWeatherSnapshot } from "@/lib/weather";
import { ensureProjectCoordinates } from "@/lib/data/geo";
import { projectToday } from "@/lib/project-time";
import { getSignedPhotoUrlMap } from "@/lib/storage";
import {
  summarizeLastReport,
  summarizeTodayPosts,
  type LastReport,
  type TodayPost,
} from "@/lib/reports-shared";
import { getProjectCore, type ScopeItemStatus } from "@/lib/data/project-core";
import { emitEventDeferred } from "@/lib/notify";
import type { ProjectStatus } from "@/lib/project-status";

export type { TodayPost } from "@/lib/reports-shared";
export type { ScopeItemStatus } from "@/lib/data/project-core";

export interface CrewHomeData {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  country: string;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  progressPercent: number;
  scope: ScopeItemStatus[];
  todayDate: string;
  todayPosts: TodayPost[];
  lat: number | null;
  lng: number | null;
  /** The last reported day before today: headcount and quantities for "Kot včeraj". */
  lastReport: LastReport | null;
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

export async function getCrewHome(actor: ProjectActor): Promise<CrewHomeData | null> {
  const core = await getProjectCore(actor);
  if (!core) return null;

  const db = createAdminClient();
  const today = core.today;

  // Today's entries, quantities and photos are all keyed by (project, date),
  // known from core, so they run in one parallel batch (audit finding M9).
  const [entriesRes, qtyRes, photoRes, priorRes] = await Promise.all([
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
    // The days before today, newest first: the last one prefills the form.
    db
      .from("daily_entries")
      .select("id, entry_date, headcount")
      .eq("project_id", actor.projectId)
      .lt("entry_date", today)
      .order("entry_date", { ascending: false })
      .limit(10),
  ]);

  if (entriesRes.error || qtyRes.error || photoRes.error || priorRes.error) return null;

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

  const prior = priorRes.data ?? [];
  const lastDate = prior[0]?.entry_date ?? null;
  const lastDay = prior.filter((e) => e.entry_date === lastDate);
  const lastQty = lastDay.length
    ? await db
        .from("entry_quantities")
        .select("entry_id, scope_item_id, qty")
        .in("entry_id", lastDay.map((e) => e.id))
    : { data: [] as { entry_id: string; scope_item_id: string; qty: number }[], error: null };
  if (lastQty.error) return null;
  const lastReport = summarizeLastReport(
    lastDay,
    (lastQty.data ?? []).map((q) => ({ ...q, qty: Number(q.qty) }))
  );

  return {
    projectId: core.id,
    projectName: core.name,
    status: core.status,
    country: core.country,
    addressStreet: core.addressStreet,
    addressZip: core.addressZip,
    addressCity: core.addressCity,
    progressPercent: core.progressPercent,
    scope: core.scope,
    todayDate: today,
    todayPosts,
    lat: core.lat,
    lng: core.lng,
    lastReport,
  };
}

// One atomic, validated database transaction (audit findings H1, H2, H4, H5, M1, M12):
// weather is bounded by a timeout, the day is server-computed, and the RPC
// validates scope-item and photo-path ownership before writing entry, quantities,
// photos and activity together, idempotent on the client-generated id.
export async function submitDailyReport(actor: ProjectActor, payload: SubmitReportPayload): Promise<string> {
  const db = createAdminClient();

  // Server-side gate: a daily report requires at least one material check on the
  // project. The UI gate alone is decoration a hand-rolled request bypasses; the
  // "material not arrived yet" escape is itself a check row, so it satisfies this.
  const { count: checkCount } = await db
    .from("material_checks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", actor.projectId);
  if (!checkCount) throw new Error("Material check required before reporting");

  const { data: project } = await db
    .from("projects")
    .select("lat, lng, country")
    .eq("id", actor.projectId)
    .maybeSingle();

  // A project created before coordinates existed, or whose geocode failed at
  // creation, gets them now: once, with one quick query, so a crew submit is
  // delayed by at most 1.5 s exactly one time per project.
  let lat = project?.lat ?? null;
  let lng = project?.lng ?? null;
  if (project && (lat === null || lng === null)) {
    const hit = await ensureProjectCoordinates(actor.projectId, { timeoutMs: 1500, maxQueries: 1 }).catch(() => null);
    if (hit) {
      lat = hit.lat;
      lng = hit.lng;
    }
  }
  const weather = await fetchWeatherSnapshot(lat, lng);
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
    // Who held the phone. A claimed crew session puts a real name on the report,
    // which is what the day pages of the completion report and the EPC's
    // notification print instead of an anonymous "the crew".
    p_person: actor.personId,
  });

  if (error || !data) throw new Error("Could not save the report");

  // The RPC already wrote the activity row inside its transaction, so the event
  // only has to do the fanout: skipActivity keeps the feed from showing the
  // same submission twice. It also carries the live ping, which is why no
  // caller of this function pings separately any more.
  await emitEventDeferred({
    projectId: actor.projectId,
    kind: "entry_submitted",
    actorPerson: actor.personId,
    skipActivity: true,
  });

  return data;
}
