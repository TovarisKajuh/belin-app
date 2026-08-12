"use server";
import { resolveActorFromSession } from "@/lib/auth";
import { resolveActorFromToken } from "@/lib/actor";
import { requireProjectActor, type ProjectActor } from "@/lib/actor";
import { isUuid } from "@/lib/actor-shared";
import {
  addLine,
  createSheet,
  decideSheet,
  removeLine,
  submitSheet,
  type AddLinePayload,
} from "@/lib/data/hours";

// Hour sheet actions, for BOTH surfaces.
//
// Unlike the naročilnica, this file serves the crew link too: writing down the
// hours you worked is site work, not a contract-forming act, and the people who
// know what happened are the ones who were there. What a link can never do is
// DECIDE: approving somebody's claim for money is office only, and decideSheet
// refuses a token actor before it looks at anything else.

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
): Promise<{ ok: true; sheetId: string }> {
  const sheetId = await createSheet(await actorFor(key, projectId));
  return { ok: true, sheetId };
}

export async function addLineAction(
  key: string,
  projectId: string,
  payload: AddLinePayload,
): Promise<{ ok: true }> {
  await addLine(await actorFor(key, projectId), payload);
  return { ok: true };
}

export async function removeLineAction(
  key: string,
  projectId: string,
  lineId: string,
): Promise<{ ok: true }> {
  await removeLine(await actorFor(key, projectId), lineId);
  return { ok: true };
}

export async function submitSheetAction(
  key: string,
  projectId: string,
  sheetId: string,
): Promise<{ ok: true }> {
  await submitSheet(await actorFor(key, projectId), sheetId);
  return { ok: true };
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
): Promise<{ ok: true }> {
  if (!isUuid(projectId)) throw new Error("Invalid project id");
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("common.askOffice");
  if (actor.role === "crew") throw new Error("common.askOffice");

  await decideSheet(await requireProjectActor(actor, projectId), sheetId, approve);
  return { ok: true };
}
