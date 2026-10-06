"use server";
import { resolveActorFromSession } from "@/lib/auth";
import {
  acceptPo,
  rejectPo,
  savePoDraft,
  sendPo,
  type SavePoPayload,
} from "@/lib/data/purchase-orders";
import type { ActionResult } from "@/lib/action-result";
import { toResult } from "@/lib/action-result-server";

// The naročilnica actions. Session only: every one of them either sets a price
// or agrees to one, and lib/data/purchase-orders.ts refuses a link actor
// anyway. There is deliberately no token twin of this file, unlike the daily
// report actions: a crew link must not reach a contract at all.
//
// Each RETURNS its failure (lib/action-result.ts): a thrown message key does
// not survive a production build.

async function personActor() {
  const actor = await resolveActorFromSession();
  if (!actor) throw new Error("Not signed in.");
  return actor;
}

export async function savePoDraftAction(
  projectId: string,
  payload: SavePoPayload,
): Promise<ActionResult<{ poId: string }>> {
  return toResult(async () => ({ poId: await savePoDraft(await personActor(), projectId, payload) }));
}

export async function sendPoAction(projectId: string, poId: string): Promise<ActionResult<null>> {
  return toResult(async () => {
    await sendPo(await personActor(), projectId, poId);
    return null;
  });
}

export async function acceptPoAction(projectId: string, poId: string): Promise<ActionResult<null>> {
  return toResult(async () => {
    await acceptPo(await personActor(), projectId, poId);
    return null;
  });
}

export async function rejectPoAction(
  projectId: string,
  poId: string,
  note: string,
): Promise<ActionResult<null>> {
  return toResult(async () => {
    await rejectPo(await personActor(), projectId, poId, note);
    return null;
  });
}
