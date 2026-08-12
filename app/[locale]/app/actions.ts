"use server";
import { resolveActorFromSession } from "@/lib/auth";
import { listNotifications, markAllRead, type NotificationRow } from "@/lib/data/notifications";

// Inbox actions. Both refuse anything that is not a signed-in person, because a
// project link has no inbox to read or empty.

async function requirePerson() {
  const actor = await resolveActorFromSession();
  if (!actor || actor.kind !== "person") throw new Error("Not signed in.");
  return actor;
}

export async function loadNotificationsAction(): Promise<NotificationRow[]> {
  return listNotifications(await requirePerson());
}

export async function markAllReadAction(): Promise<{ ok: true }> {
  await markAllRead(await requirePerson());
  return { ok: true };
}
