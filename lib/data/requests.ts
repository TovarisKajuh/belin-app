import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/actor-shared";
import type { ProjectActor } from "@/lib/actor";
import { emitEventDeferred } from "@/lib/notify";
import { getSignedPhotoUrlMap } from "@/lib/storage";

// The crew asking the office for something: more material, a plan, an
// instruction. The table has existed since the first migration and nothing has
// ever written to it; this is its first consumer.
//
// The design point is the ANSWER. A crew member has no inbox and no account, so
// a resolution that only appears on the EPC's dashboard is invisible to the
// person who asked. Every request therefore carries its response note back to
// the same sheet the crew opened to ask, which is the only place they will
// look.

import {
  REQUEST_TYPES,
  type CreateRequestPayload,
  type RequestRow,
  type RequestType,
} from "@/lib/requests-shared";

export type { RequestType, RequestRow, CreateRequestPayload } from "@/lib/requests-shared";
export { REQUEST_TYPES } from "@/lib/requests-shared";

export async function createRequest(
  actor: ProjectActor,
  payload: CreateRequestPayload,
): Promise<string> {
  if (actor.role !== "sub") throw new Error("Forbidden: the crew asks, the office answers.");
  if (!isUuid(payload.clientGeneratedId)) throw new Error("Invalid request id");

  const type = REQUEST_TYPES.find((candidate) => candidate === payload.type);
  if (!type) throw new Error("request.err.type");

  const text = payload.text.trim();
  if (!text) throw new Error("request.err.text");

  // The photo path is checked against the prefix this request may own, the same
  // rule the daily report and incident paths follow.
  const prefix = `${actor.projectId}/request/${payload.clientGeneratedId}-`;
  const photoPath =
    payload.photoPath && payload.photoPath.startsWith(prefix) ? payload.photoPath : null;

  const db = createAdminClient();
  const { data, error } = await db
    .from("requests")
    .insert({
      project_id: actor.projectId,
      type,
      text,
      photo_path: photoPath,
      created_by_person: actor.personId,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error("Could not save the request");

  await emitEventDeferred({
    projectId: actor.projectId,
    kind: "request_created",
    actorPerson: actor.personId,
    payload: { text },
  });

  return data.id;
}

export async function resolveRequest(
  actor: ProjectActor,
  requestId: string,
  note: string,
): Promise<void> {
  if (actor.role !== "epc") throw new Error("Forbidden: the office resolves requests.");
  if (!isUuid(requestId)) throw new Error("Invalid request id");

  const responseNote = note.trim();
  if (!responseNote) throw new Error("request.err.note");

  // One conditional update: two Bauleiter answering the same request at once
  // must not overwrite each other's answer, and the crew must not see the
  // second one replace the first they already read.
  const { data, error } = await createAdminClient()
    .from("requests")
    .update({
      status: "resolved",
      response_note: responseNote,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("project_id", actor.projectId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error("request.err.conflict");

  await emitEventDeferred({
    projectId: actor.projectId,
    kind: "request_resolved",
    actorPerson: actor.personId,
    payload: { note: responseNote },
  });
}

/** Open requests first, then recently resolved ones, which is the crew's answer channel. */
export async function listRequests(actor: ProjectActor, limit = 20): Promise<RequestRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("requests")
    .select("id, type, text, status, response_note, photo_path, created_at, resolved_at, people (full_name)")
    .eq("project_id", actor.projectId)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = data ?? [];
  const signed = await getSignedPhotoUrlMap(
    rows.map((row) => row.photo_path).filter((path): path is string => Boolean(path)),
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type as RequestType,
    text: row.text,
    status: row.status as "open" | "resolved",
    responseNote: row.response_note,
    photoUrl: row.photo_path ? (signed[row.photo_path] ?? null) : null,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    authorName: row.people?.full_name ?? null,
  }));
}
