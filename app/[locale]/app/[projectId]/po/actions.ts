"use server";
import { resolveActorFromSession } from "@/lib/auth";
import {
  acceptPo,
  rejectPo,
  savePoDraft,
  sendPo,
  type SavePoPayload,
} from "@/lib/data/purchase-orders";

// The naročilnica actions. Session only: every one of them either sets a price
// or agrees to one, and lib/data/purchase-orders.ts refuses a link actor
// anyway. There is deliberately no token twin of this file, unlike the daily
// report actions: a crew link must not reach a contract at all.

async function personActor() {
  const actor = await resolveActorFromSession();
  if (!actor) throw new Error("Not signed in.");
  return actor;
}

export async function savePoDraftAction(
  projectId: string,
  payload: SavePoPayload,
): Promise<{ ok: true; poId: string }> {
  const poId = await savePoDraft(await personActor(), projectId, payload);
  return { ok: true, poId };
}

export async function sendPoAction(projectId: string, poId: string): Promise<{ ok: true }> {
  await sendPo(await personActor(), projectId, poId);
  return { ok: true };
}

export async function acceptPoAction(projectId: string, poId: string): Promise<{ ok: true }> {
  await acceptPo(await personActor(), projectId, poId);
  return { ok: true };
}

export async function rejectPoAction(
  projectId: string,
  poId: string,
  note: string,
): Promise<{ ok: true }> {
  await rejectPo(await personActor(), projectId, poId, note);
  return { ok: true };
}
