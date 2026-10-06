import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { throwIfReadFailed } from "@/lib/db-error";
import { isUuid } from "@/lib/actor-shared";
import type { ProjectActor } from "@/lib/actor";
import { emitEventDeferred } from "@/lib/notify";
import { getSignedPhotoUrlMap } from "@/lib/storage";
import { round2 } from "@/lib/po-shared";
import {
  MAX_CO_PHOTOS,
  type ChangeOrderRow,
  type ChangeOrderStatus,
  type CreateChangeOrderPayload,
} from "@/lib/change-orders-view";

export type {
  ChangeOrderRow,
  ChangeOrderStatus,
  CreateChangeOrderPayload,
} from "@/lib/change-orders-view";

// Nachträge: work nobody agreed to when the price was set.
//
// They live beside Regiestunden on one screen because they are the same
// conversation from the subcontractor's side, "this costs more than we said",
// and separating them would mean an EPC has to remember two places to look for
// money they have not approved yet.
//
// The amount is nullable on purpose. A crew member photographing a rotten
// batten at four in the afternoon usually cannot price it, and refusing the
// record until they can would lose the evidence that matters most. What the
// product must never do is quietly bill nothing: an approved extra with no
// amount is surfaced as a warning at invoice time rather than silently dropped.

const CONFLICT = "co.conflict";

export async function listChangeOrders(actor: ProjectActor): Promise<ChangeOrderRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("change_orders")
    .select(
      "id, number, title, description, amount, status, created_at, decided_at, people:created_by_person (full_name), decider:decided_by_person (full_name), change_order_photos (storage_path, sort_order)",
    )
    .eq("project_id", actor.projectId)
    .order("number", { ascending: false });
  throwIfReadFailed(error, "listChangeOrders");

  const rows = data ?? [];
  const signed = await getSignedPhotoUrlMap(
    rows.flatMap((row) => (row.change_order_photos ?? []).map((photo) => photo.storage_path)),
  );

  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    title: row.title,
    description: row.description,
    amount: row.amount === null ? null : Number(row.amount),
    status: row.status as ChangeOrderStatus,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    decidedByName: row.decider?.full_name ?? null,
    authorName: row.people?.full_name ?? null,
    photoUrls: (row.change_order_photos ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => signed[photo.storage_path])
      .filter(Boolean),
  }));
}

export async function createChangeOrder(
  actor: ProjectActor,
  payload: CreateChangeOrderPayload,
): Promise<string> {
  if (actor.role !== "sub") throw new Error("Forbidden: the contractor claims extra work.");
  if (!isUuid(payload.clientGeneratedId)) throw new Error("Invalid change order id");

  const title = payload.title.trim();
  if (!title) throw new Error("co.err.title");

  const amount =
    payload.amount === null || !Number.isFinite(payload.amount) || payload.amount < 0
      ? null
      : round2(payload.amount);

  const prefix = `${actor.projectId}/co/${payload.clientGeneratedId}/`;
  const paths = payload.photoPaths
    .filter((path) => path.startsWith(prefix))
    .slice(0, MAX_CO_PHOTOS);

  const db = createAdminClient();

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: top } = await db
      .from("change_orders")
      .select("number")
      .eq("project_id", actor.projectId)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await db
      .from("change_orders")
      .insert({
        project_id: actor.projectId,
        number: (top?.number ?? 0) + 1,
        title,
        description: payload.description?.trim() || null,
        amount,
        status: "submitted",
        created_by_person: actor.personId,
      })
      .select("id, number")
      .maybeSingle();

    if (error?.code === "23505") continue;
    if (error || !data) throw new Error("Could not save the change order");

    if (paths.length > 0) {
      await db.from("change_order_photos").insert(
        paths.map((storage_path, sort_order) => ({
          change_order_id: data.id,
          storage_path,
          sort_order,
        })),
      );
    }

    await emitEventDeferred({
      projectId: actor.projectId,
      kind: "change_order_submitted",
      actorPerson: actor.personId,
      payload: { title, number: String(data.number) },
    });

    return data.id;
  }

  throw new Error("Could not save the change order");
}

export async function decideChangeOrder(
  actor: ProjectActor,
  changeOrderId: string,
  approve: boolean,
): Promise<void> {
  if (actor.role !== "epc") throw new Error("Forbidden: the client decides.");
  if (!isUuid(changeOrderId)) throw new Error("Invalid change order id");

  // One conditional update, as everywhere a decision is recorded: whoever gets
  // there first decides, and the second person is told rather than silently
  // overwriting the first.
  const { data, error } = await createAdminClient()
    .from("change_orders")
    .update({
      status: approve ? "approved" : "rejected",
      decided_at: new Date().toISOString(),
      decided_by_person: actor.personId,
    })
    .eq("id", changeOrderId)
    .eq("project_id", actor.projectId)
    .eq("status", "submitted")
    .select("id, number")
    .maybeSingle();

  if (error || !data) throw new Error(CONFLICT);

  await emitEventDeferred({
    projectId: actor.projectId,
    kind: "change_order_decided",
    actorPerson: actor.personId,
    payload: {
      number: String(data.number),
      decision: approve ? "approved" : "rejected",
    },
  });
}

/** Approved extras for the invoice, in number order. */
export async function approvedChangeOrders(
  projectId: string,
): Promise<{ number: number; title: string; amount: number | null }[]> {
  const { data } = await createAdminClient()
    .from("change_orders")
    .select("number, title, amount")
    .eq("project_id", projectId)
    .eq("status", "approved")
    .order("number");

  return (data ?? []).map((row) => ({
    number: row.number,
    title: row.title,
    amount: row.amount === null ? null : Number(row.amount),
  }));
}
