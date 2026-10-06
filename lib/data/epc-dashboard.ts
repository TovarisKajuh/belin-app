import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectActor } from "@/lib/actor";
import { listIncidents, type IncidentRow } from "@/lib/data/incidents";
import { listRequests, type RequestRow } from "@/lib/data/requests";
import { emitEventDeferred } from "@/lib/notify";
import { expiryState, EXPIRY_WARN_DAYS, type ExpiryState, type VaultType } from "@/lib/vault-shared";
import { getProjectCore, type ProjectCore, type ScopeItemStatus } from "@/lib/data/project-core";
import { getSignedPhotoUrlMap } from "@/lib/storage";
import { weatherCodeToKey } from "@/lib/weather-codes";
import { projectProgress } from "@/lib/progress";
import { computeProjection, type Projection, type DailyProgressPoint } from "@/lib/projection-shared";
import {
  buildMaterialState,
  type MaterialItemRow,
  type LatestCheck,
  type MaterialCheckStatus,
} from "@/lib/materials-shared";

export interface MaterialPanelDoc {
  kind: "material_photo" | "delivery_note";
  url: string;
}

export interface MaterialPanelData {
  items: MaterialItemRow[];
  latest:
    | {
        id: string;
        isComplete: boolean;
        note: string | null;
        checkedAt: string;
        items: { materialItemId: string; status: MaterialCheckStatus; missingQty: number | null }[];
        docs: MaterialPanelDoc[];
      }
    | null;
  needsFirstCheck: boolean;
  uncoveredOrChanged: number;
}

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

export interface EpcDashboardData {
  core: ProjectCore;
  subName: string | null;
  progressPercent: number;
  scope: ScopeItemStatus[];
  days: DashboardDay[];
  latest: DashboardDay | null;
  gallery: DashboardPhoto[];
  projection: Projection;
  history: DailyProgressPoint[];
  reportCount: number;
  photoCount: number;
  needsReview: boolean;
  material: MaterialPanelData;
  /** One entry per roof from the plan; empty when the plan named none. */
  roofs: DashboardRoof[];
  /** Site incidents from the last two weeks, newest first. */
  incidents: IncidentRow[];
  /** Open requests first: the crew is waiting on these. */
  requests: RequestRow[];
  /** The subcontractor's compliance documents, as the EPC is allowed to see them. */
  compliance: ComplianceDoc[];
}

export interface ComplianceDoc {
  id: string;
  type: VaultType;
  title: string | null;
  validUntil: string | null;
  state: ExpiryState;
}

export interface DashboardRoof {
  name: string;
  moduleCount: number | null;
  kwp: number | null;
  pitchDeg: number | null;
  covering: string | null;
}

// The single dashboard read. Composes the shared project core (header, scope,
// weighted progress, planned dates, site-local day) with the full day-by-day
// log, the site photo set (signed in one cached batch), the recent activity,
// a projection computed from the cumulative-progress history, and the material
// panel state (list, latest check, re-check count). Realtime is a later chunk.
export async function getEpcDashboard(actor: ProjectActor): Promise<EpcDashboardData | null> {
  const core = await getProjectCore(actor);
  if (!core) return null;

  const db = createAdminClient();

  const [entriesRes, qtyRes, photoRes, matItemsRes, matCheckRes, roofRes] = await Promise.all([
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
      .from("material_items")
      .select("id, name, qty, unit, sort_order, updated_at")
      .eq("project_id", actor.projectId)
      .order("sort_order"),
    db
      .from("material_checks")
      .select(
        "id, is_complete, note, checked_at, material_check_items (material_item_id, status, missing_qty), material_check_docs (kind, storage_path, sort_order)"
      )
      .eq("project_id", actor.projectId)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("project_roofs")
      .select("name, module_count, kwp, pitch_deg, covering, sort_order")
      .eq("project_id", actor.projectId)
      .order("sort_order"),
  ]);

  if (entriesRes.error || qtyRes.error || photoRes.error || matItemsRes.error || matCheckRes.error)
    return null;

  // A roof read failure degrades to no roof panel rather than killing the whole
  // dashboard: it is context, not the point of the screen.
  const roofs: DashboardRoof[] = (roofRes.data ?? []).map((r) => ({
    name: r.name,
    moduleCount: r.module_count,
    kwp: r.kwp === null ? null : Number(r.kwp),
    pitchDeg: r.pitch_deg === null ? null : Number(r.pitch_deg),
    covering: r.covering,
  }));

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

  // Photos and material docs: sign every path in ONE cached batch, deduped, then
  // split back out by their source rows.
  const photoRows = photoRes.data ?? [];
  const docRows = matCheckRes.data?.material_check_docs ?? [];
  const allPaths = [
    ...photoRows.map((r) => r.storage_path),
    ...docRows.map((d) => d.storage_path),
  ];
  const urlByPath = await getSignedPhotoUrlMap([...new Set(allPaths)]);
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

  // A delivered project is judged on where it actually landed: its last day
  // with reported quantities, the same day the portfolio card uses
  // (scheduleVarianceDays), so the card and this overview cannot disagree.
  const lastReportedDate =
    entries.find((e) => (rawQtyByEntry[e.id] ?? []).length > 0)?.entry_date ?? null;
  const projection = computeProjection({
    history,
    currentPercent: core.progressPercent,
    today: core.today,
    plannedStart: core.plannedStart,
    plannedEnd: core.plannedEnd,
    deliveredOn: core.status === "finished" ? lastReportedDate : null,
  });

  // Material panel: reduce the list and latest check to the gate/re-check state,
  // and sign the docs from the shared batch. The doc COUNT derives from
  // successfully signed URLs (via urlByPath), so a row whose path failed to sign
  // never shows a count with a missing thumbnail.
  const matItems: MaterialItemRow[] = (matItemsRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    qty: Number(r.qty),
    unit: r.unit,
    sortOrder: r.sort_order,
    updatedAt: r.updated_at,
  }));
  const matCheck = matCheckRes.data;
  const matLatest: LatestCheck | null = matCheck
    ? {
        id: matCheck.id,
        isComplete: matCheck.is_complete,
        note: matCheck.note,
        checkedAt: matCheck.checked_at,
        items: (matCheck.material_check_items ?? []).map((i) => ({
          materialItemId: i.material_item_id,
          status: i.status as MaterialCheckStatus,
          missingQty: i.missing_qty === null ? null : Number(i.missing_qty),
        })),
        docs: [],
      }
    : null;
  const matState = buildMaterialState(matItems, matLatest);
  const panelDocs: MaterialPanelDoc[] = [...docRows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((d) => ({ kind: d.kind as MaterialPanelDoc["kind"], url: urlByPath[d.storage_path] }))
    .filter((d): d is MaterialPanelDoc => Boolean(d.url));
  const material: MaterialPanelData = {
    items: matState.items,
    needsFirstCheck: matState.needsFirstCheck,
    uncoveredOrChanged: matState.uncoveredOrChanged,
    latest: matLatest
      ? {
          id: matLatest.id,
          isComplete: matLatest.isComplete,
          note: matLatest.note,
          checkedAt: matLatest.checkedAt,
          items: matLatest.items,
          docs: panelDocs,
        }
      : null,
  };

  // The sub-org embed is to-one; supabase may type it as an object or a
  // single-element array, so narrow defensively.
  return {
    core,
    subName: core.subName,
    progressPercent: core.progressPercent,
    scope: core.scope,
    days,
    latest: days[0] ?? null,
    gallery,
    projection,
    history,
    reportCount: entries.length,
    photoCount: photoRows.length,
    needsReview: core.status === "reviewing",
    material,
    roofs,
    incidents: await listIncidents(actor),
    requests: await listRequests(actor),
    compliance: await loadCompliance(actor.projectId),
  };
}

/**
 * The subcontractor's documents, read for the EPC.
 *
 * The storage paths are deliberately NOT signed here: this panel shows whether
 * a certificate exists and whether it is still valid, which is what an EPC has
 * a legitimate interest in. An A1 carries a named person's identity data, so
 * opening the file itself stays with the company that uploaded it.
 */
async function loadCompliance(projectId: string): Promise<ComplianceDoc[]> {
  const db = createAdminClient();

  // The sub org is read from the project rather than passed in, so the only
  // documents this can ever reach are the ones belonging to the company that
  // is actually contracted on THIS project.
  const { data: project } = await db
    .from("projects")
    .select("sub_org_id")
    .eq("id", projectId)
    .maybeSingle();
  const subOrgId = project?.sub_org_id;
  if (!subOrgId) return [];
  const { data } = await db
    .from("documents")
    .select("id, type, title, valid_until")
    .eq("org_id", subOrgId)
    .order("valid_until", { ascending: true, nullsFirst: false });

  const now = new Date();
  const docs = (data ?? []).map((row) => ({
    id: row.id,
    type: row.type as VaultType,
    title: row.title,
    validUntil: row.valid_until,
    state: expiryState(row.valid_until, now),
  }));

  await warnAboutExpiries(projectId, docs);
  return docs;
}

/**
 * Tells the subcontractor once, per document, per threshold, that a certificate
 * is running out. The dashboard render is what notices, so the claim has to be
 * atomic: inserting the document_reminders row IS the claim, and only the
 * caller whose insert succeeds sends anything. Two people opening the dashboard
 * in the same second therefore produce one warning, not two, and the unique
 * index added in 20260812102000 is what makes that true rather than likely.
 */
async function warnAboutExpiries(projectId: string, docs: ComplianceDoc[]): Promise<void> {
  const due = docs.filter((doc) => doc.state === "expiringSoon" || doc.state === "expired");
  if (due.length === 0) return;

  const db = createAdminClient();

  for (const doc of due) {
    const threshold = doc.state === "expired" ? 0 : EXPIRY_WARN_DAYS;
    const { error } = await db
      .from("document_reminders")
      .insert({ document_id: doc.id, days_before: threshold });

    // 23505: somebody already claimed this threshold. Nothing to do, and
    // deliberately not an error: this is the common path.
    if (error) continue;

    await emitEventDeferred({
      projectId,
      kind: "document_expiring",
      actorPerson: null,
      payload: {
        title: doc.title ?? "",
        date: doc.validUntil ?? "",
      },
    });
  }
}
