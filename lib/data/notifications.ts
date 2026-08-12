import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PersonActor } from "@/lib/actor";

// The in-app inbox. Person only: a project link has no inbox, because a link is
// not a person and there is nobody for it to be unread by.
//
// Every query is scoped by recipient_person = the acting person's own id, which
// is the whole access rule. There is no "notifications for this project" read
// anywhere: one person's inbox is one person's inbox.

export interface NotificationRow {
  id: string;
  kind: string;
  projectId: string | null;
  projectName: string | null;
  payload: Record<string, string>;
  createdAt: string;
  readAt: string | null;
}

export async function getUnreadCount(actor: PersonActor): Promise<number> {
  const db = createAdminClient();
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_person", actor.personId)
    .is("read_at", null);
  return count ?? 0;
}

/** The latest 20. Deliberately not paginated: an inbox nobody empties is a feed. */
export async function listNotifications(actor: PersonActor): Promise<NotificationRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("notifications")
    .select("id, kind, project_id, payload, created_at, read_at, projects (name)")
    .eq("recipient_person", actor.personId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    payload: (row.payload ?? {}) as Record<string, string>,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

/**
 * Marks everything read in one statement. Opening the panel is the read
 * receipt: a per row "mark as read" control is a chore, and an inbox that
 * needs tidying stops being opened at all.
 */
export async function markAllRead(actor: PersonActor): Promise<void> {
  const db = createAdminClient();
  await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_person", actor.personId)
    .is("read_at", null);
}
