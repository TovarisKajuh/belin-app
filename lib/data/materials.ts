import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProjectActor } from "@/lib/actor";
import type { Json } from "@/lib/database.types";
import {
  buildMaterialState,
  type MaterialState,
  type MaterialItemRow,
  type LatestCheck,
  type MaterialCheckStatus,
} from "@/lib/materials-shared";
import { emitEventDeferred } from "@/lib/notify";
import { notifyProject } from "@/lib/realtime-server";

export type { MaterialState } from "@/lib/materials-shared";

// The current material state for a project: the EPC's list plus the latest
// check (items and documents), reduced to the crew gate and the re-check count
// by buildMaterialState. Document paths stay unsigned here; callers that render
// them (the EPC panel) sign them where they batch with the photo gallery.
export async function getMaterialState(actor: ProjectActor): Promise<MaterialState | null> {
  const db = createAdminClient();

  const [itemsRes, checkRes] = await Promise.all([
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
  ]);

  if (itemsRes.error || checkRes.error) return null;

  const items: MaterialItemRow[] = (itemsRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    qty: Number(r.qty),
    unit: r.unit,
    sortOrder: r.sort_order,
    updatedAt: r.updated_at,
  }));

  const c = checkRes.data;
  const latest: LatestCheck | null = c
    ? {
        id: c.id,
        isComplete: c.is_complete,
        note: c.note,
        checkedAt: c.checked_at,
        items: (c.material_check_items ?? []).map((i) => ({
          materialItemId: i.material_item_id,
          status: i.status as MaterialCheckStatus,
          missingQty: i.missing_qty === null ? null : Number(i.missing_qty),
        })),
        docs: (c.material_check_docs ?? [])
          .map((d) => ({
            kind: d.kind as "material_photo" | "delivery_note",
            storagePath: d.storage_path,
            sortOrder: d.sort_order,
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }
    : null;

  return buildMaterialState(items, latest);
}

export interface SubmitMaterialCheckPayload {
  clientGeneratedId: string;
  note: string;
  items: { material_item_id: string; status: MaterialCheckStatus; missing_qty: number | null }[];
  materialPhotoPaths: string[];
  deliveryNotePaths: string[];
}

// Records a material check. The RPC is idempotent on clientGeneratedId,
// validates ownership and paths, and derives completeness. No isComplete is
// passed: the database is the authority.
export async function submitMaterialCheck(
  actor: ProjectActor,
  payload: SubmitMaterialCheckPayload
): Promise<string> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("submit_material_check", {
    p_project: actor.projectId,
    p_client_id: payload.clientGeneratedId,
    p_note: payload.note,
    p_items: payload.items as unknown as Json,
    p_material_photos: payload.materialPhotoPaths,
    p_delivery_notes: payload.deliveryNotePaths,
  });
  if (error || !data) throw new Error("Could not save the material check");

  // Only a check WITH shortfalls is news. A delivery that arrived complete is
  // the expected case, and mailing the EPC about every expected case is how a
  // notification system trains people to ignore it. The database derives
  // completeness inside the RPC, so it is read back rather than trusted from
  // the client. The ping rides along with the event either way, which is why
  // the callers of this function no longer ping separately.
  const { data: check } = await db
    .from("material_checks")
    .select("is_complete")
    .eq("id", data)
    .maybeSingle();

  if (check?.is_complete === false) {
    await emitEventDeferred({
      projectId: actor.projectId,
      kind: "material_check_completed",
      actorPerson: actor.personId,
      skipActivity: true,
    });
  } else {
    // Complete delivery: no notification, but the EPC dashboard still has to
    // learn that the gate is cleared, so the ping goes out on its own.
    await notifyProject(actor.projectId);
  }

  return data;
}

// EPC adds a line to the Stückliste. A stopgap until the plan PDF extraction
// exists; it is the trigger for the crew re-check prompt.
export async function addMaterialItem(
  actor: ProjectActor,
  item: { name: string; qty: number; unit: string }
): Promise<void> {
  const name = item.name.trim();
  const unit = item.unit.trim();
  if (!name || !unit || !(item.qty > 0)) throw new Error("Invalid material item");

  const db = createAdminClient();
  const { data: maxRow } = await db
    .from("material_items")
    .select("sort_order")
    .eq("project_id", actor.projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("material_items").insert({
    project_id: actor.projectId,
    name,
    qty: item.qty,
    unit,
    sort_order: (maxRow?.sort_order ?? 0) + 1,
  });
  if (error) throw new Error("Could not add the material item");
}
