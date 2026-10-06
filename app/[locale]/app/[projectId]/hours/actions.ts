"use server";
import { resolveActorFromSession } from "@/lib/auth";
import { resolveActorFromToken } from "@/lib/actor";
import { requireProjectActor, type ProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import {
  createChangeOrder,
  decideChangeOrder,
  type CreateChangeOrderPayload,
} from "@/lib/data/change-orders";
import { createChangeOrderPhotoTargets, type UploadTarget } from "@/lib/storage";
import {
  addLine,
  createSheet,
  decideSheet,
  removeLine,
  submitSheet,
  type AddLinePayload,
} from "@/lib/data/hours";
import type { ActionResult } from "@/lib/action-result";
import { toResult } from "@/lib/action-result-server";

// Hour sheet actions, for BOTH surfaces.
//
// Unlike the naročilnica, this file serves the crew link too: writing down the
// hours you worked is site work, not a contract-forming act, and the people who
// know what happened are the ones who were there. What a link can never do is
// DECIDE: approving somebody's claim for money is office only, and decideSheet
// refuses a token actor before it looks at anything else.
//
// Every action a screen decodes RETURNS its failure, see lib/action-result.ts.

async function actorFor(key: string, projectId: string): Promise<ProjectActor> {
  if (!isUuid(projectId)) throw new Error("Invalid project id");

  // A key that is not the project id is a link token.
  if (key !== projectId) {
    const actor = await resolveActorFromToken(key);
    if (!actor) throw new Error("Not authorized for this project.");
    return requireProjectActor(actor, projectId);
  }

  const actor = await resolveActorFromSession();
  if (!actor) throw new Error("Not signed in.");
  return requireProjectActor(actor, projectId);
}

export async function createSheetAction(
  key: string,
  projectId: string,
): Promise<ActionResult<{ sheetId: string }>> {
  return toResult(async () => ({ sheetId: await createSheet(await actorFor(key, projectId)) }));
}

export async function addLineAction(
  key: string,
  projectId: string,
  payload: AddLinePayload,
): Promise<ActionResult<null>> {
  return toResult(async () => {
    await addLine(await actorFor(key, projectId), payload);
    return null;
  });
}

export async function removeLineAction(
  key: string,
  projectId: string,
  lineId: string,
): Promise<ActionResult<null>> {
  return toResult(async () => {
    await removeLine(await actorFor(key, projectId), lineId);
    return null;
  });
}

export async function submitSheetAction(
  key: string,
  projectId: string,
  sheetId: string,
): Promise<ActionResult<null>> {
  return toResult(async () => {
    await submitSheet(await actorFor(key, projectId), sheetId);
    return null;
  });
}

/**
 * Deciding is SESSION ONLY. A link is a shared secret; approving a claim for
 * money with one would mean anybody who was ever forwarded the project link can
 * commit the client to paying it.
 */
export async function decideSheetAction(
  projectId: string,
  sheetId: string,
  approve: boolean,
): Promise<ActionResult<null>> {
  return toResult(async () => {
    if (!isUuid(projectId)) throw new Error("Invalid project id");
    const actor = await resolveActorFromSession();
    if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
    if (actor.role === "crew") throw new Error("common.askOffice");
    await decideSheet(await requireProjectActor(actor, projectId), sheetId, approve);
    return null;
  });
}

export async function requestChangeOrderPhotoTargets(
  key: string,
  projectId: string,
  changeOrderClientId: string,
  count: number
): Promise<UploadTarget[]> {
  const actor = await actorFor(key, projectId);
  if (actor.role !== "sub") throw new Error("Forbidden.");
  return createChangeOrderPhotoTargets(projectId, changeOrderClientId, count);
}

export async function createChangeOrderAction(
  key: string,
  projectId: string,
  payload: CreateChangeOrderPayload,
): Promise<ActionResult<{ id: string }>> {
  return toResult(async () => ({ id: await createChangeOrder(await actorFor(key, projectId), payload) }));
}

/** Session only, like every act that commits somebody to paying. */
export async function decideChangeOrderAction(
  projectId: string,
  changeOrderId: string,
  approve: boolean,
): Promise<ActionResult<null>> {
  return toResult(async () => {
    if (!isUuid(projectId)) throw new Error("Invalid project id");
    const actor = await resolveActorFromSession();
    if (!actor || actor.kind !== "person" || actor.role === "crew") throw new Error("common.askOffice");
    await decideChangeOrder(await requireProjectActor(actor, projectId), changeOrderId, approve);
    return null;
  });
}
