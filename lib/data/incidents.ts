import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/actor-shared";
import type { ProjectActor } from "@/lib/actor";
import { emitEventDeferred } from "@/lib/notify";
import { projectToday } from "@/lib/project-time";
import { getSignedPhotoUrlMap } from "@/lib/storage";
import { validateIncident, type IncidentKind } from "@/lib/incidents-shared";
import { docString, type DocLocale } from "@/lib/pdf/strings";

// Incidents: what went wrong on site, recorded the moment it happens.
//
// This is the crew's second write path after the daily report, and it follows
// the same rules: the day is computed server side from the project's own
// country rather than trusted from a phone whose clock may be anything, photo
// paths are validated against the project's own prefix, and a partial photo
// upload never blocks the record. Something going wrong on a roof is exactly
// when the app must not argue.

export interface IncidentPayload {
  clientGeneratedId: string;
  kind: string;
  note: string;
  photoPaths: string[];
}

export interface IncidentRow {
  id: string;
  kind: IncidentKind;
  note: string;
  occurredOn: string;
  createdAt: string;
  authorName: string | null;
  photoUrls: string[];
}

export async function createIncident(
  actor: ProjectActor,
  payload: IncidentPayload,
): Promise<string> {
  // The sub side reports what happens on site. An EPC noticing something from
  // the office records it through their own channels, not as a site incident.
  if (actor.role !== "sub") throw new Error("Forbidden: the crew records incidents.");
  if (!isUuid(payload.clientGeneratedId)) throw new Error("Invalid incident id");

  const validation = validateIncident({
    kind: payload.kind,
    note: payload.note,
    photoCount: payload.photoPaths.length,
  });
  if (!validation.ok) throw new Error(`incident.err.${validation.error}`);

  // Photo paths come from a client that was handed signed upload URLs, but the
  // paths themselves arrive back over the wire, so they are checked against the
  // prefix this incident is allowed to own before any of them is stored.
  const prefix = `${actor.projectId}/incident/${payload.clientGeneratedId}/`;
  const paths = payload.photoPaths.filter((path) => path.startsWith(prefix));

  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select("country, language")
    .eq("id", actor.projectId)
    .maybeSingle();

  const { data: incident, error } = await db
    .from("incidents")
    .insert({
      project_id: actor.projectId,
      kind: validation.kind,
      note: validation.note,
      occurred_on: projectToday(project?.country ?? null),
      created_by_person: actor.personId,
    })
    .select("id")
    .maybeSingle();

  if (error || !incident) throw new Error("Could not save the incident");

  if (paths.length > 0) {
    // A failed photo insert must not lose the incident itself: the note and the
    // fact that something happened are worth more than the pictures.
    await db.from("incident_photos").insert(
      paths.map((storage_path, sort_order) => ({
        incident_id: incident.id,
        storage_path,
        sort_order,
      })),
    );
  }

  const locale = (project?.language ?? "sl") as DocLocale;
  await emitEventDeferred({
    projectId: actor.projectId,
    kind: "incident_created",
    actorPerson: actor.personId,
    payload: {
      // Resolved server side in the PROJECT's language, because the recipient
      // reads it, not the person who typed it.
      kindLabel: docString(locale, `incident.kinds.${validation.kind}`),
      note: validation.note,
    },
  });

  return incident.id;
}

/** The project's incidents, newest first, with signed photo URLs. */
export async function listIncidents(
  actor: ProjectActor,
  sinceDays = 14,
): Promise<IncidentRow[]> {
  const db = createAdminClient();
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 10);

  const { data } = await db
    .from("incidents")
    .select("id, kind, note, occurred_on, created_at, people (full_name), incident_photos (storage_path, sort_order)")
    .eq("project_id", actor.projectId)
    .gte("occurred_on", since)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const allPaths = rows.flatMap((row) =>
    (row.incident_photos ?? []).map((photo) => photo.storage_path),
  );
  const signed = await getSignedPhotoUrlMap(allPaths);

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as IncidentKind,
    note: row.note,
    occurredOn: row.occurred_on,
    createdAt: row.created_at,
    authorName: row.people?.full_name ?? null,
    photoUrls: (row.incident_photos ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => signed[photo.storage_path])
      .filter(Boolean),
  }));
}
