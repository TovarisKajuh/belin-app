import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/actor-shared";

export interface UploadTarget {
  path: string;
  token: string;
}

const clampCount = (n: number) => Math.max(0, Math.min(Math.floor(n) || 0, 6));

// Mint one signed upload URL per photo. The client uploads directly to the
// private bucket with the returned token, so the service role key stays on
// the server. Paths are namespaced by project and by the client entry id.
export async function createPhotoUploadTargets(
  projectId: string,
  entryClientId: string,
  count: number
): Promise<UploadTarget[]> {
  const db = createAdminClient();
  const targets: UploadTarget[] = [];
  for (let i = 0; i < count; i++) {
    const path = `${projectId}/${entryClientId}/${i}-${randomUUID()}.jpg`;
    const { data, error } = await db.storage.from("photos").createSignedUploadUrl(path);
    if (error || !data) throw new Error("Could not create upload URL");
    targets.push({ path: data.path, token: data.token });
  }
  return targets;
}


// Signed upload URLs for one incident's photos. Same shape as the daily report
// targets, in its own path namespace so an incident's pictures cannot be
// confused with a day's work photos when either is read back later. The client
// id is UUID validated before it touches a path: it arrives from a phone.
export async function createIncidentPhotoTargets(
  projectId: string,
  incidentClientId: string,
  count: number
): Promise<UploadTarget[]> {
  if (!isUuid(projectId)) throw new Error("Invalid project id");
  if (!isUuid(incidentClientId)) throw new Error("Invalid incident id");

  const db = createAdminClient();
  const targets: UploadTarget[] = [];
  for (let i = 0; i < clampCount(count); i++) {
    const path = `${projectId}/incident/${incidentClientId}/${i}-${randomUUID()}.jpg`;
    const { data, error } = await db.storage.from("photos").createSignedUploadUrl(path);
    if (error || !data) throw new Error("Could not create upload URL");
    targets.push({ path: data.path, token: data.token });
  }
  return targets;
}


// One signed upload URL for a request photo. A single picture, because a crew
// member asking for something is showing one thing: the empty pallet, the
// wrong bracket, the drawing they cannot read.
export async function createRequestPhotoTarget(
  projectId: string,
  requestClientId: string
): Promise<UploadTarget> {
  if (!isUuid(projectId)) throw new Error("Invalid project id");
  if (!isUuid(requestClientId)) throw new Error("Invalid request id");

  const db = createAdminClient();
  const path = `${projectId}/request/${requestClientId}-${randomUUID()}.jpg`;
  const { data, error } = await db.storage.from("photos").createSignedUploadUrl(path);
  if (error || !data) throw new Error("Could not create upload URL");
  return { path: data.path, token: data.token };
}

// Mint signed upload URLs for a material check's two document kinds. Paths are
// bound to the check's own folder (project/material/clientId/...), which is
// exactly the prefix the RPC validates, so a check can only reference its own
// uploads. checkClientId MUST be a UUID before it reaches a path.
export async function createMaterialDocTargets(
  projectId: string,
  checkClientId: string,
  photoCount: number,
  noteCount: number
): Promise<{ photos: UploadTarget[]; notes: UploadTarget[] }> {
  if (!isUuid(checkClientId)) throw new Error("Invalid material check id");
  const db = createAdminClient();
  const base = `${projectId}/material/${checkClientId}`;

  const mint = async (prefix: string, count: number): Promise<UploadTarget[]> => {
    const out: UploadTarget[] = [];
    for (let i = 0; i < clampCount(count); i++) {
      const path = `${base}/${prefix}-${i}-${randomUUID()}.jpg`;
      const { data, error } = await db.storage.from("photos").createSignedUploadUrl(path);
      if (error || !data) throw new Error("Could not create upload URL");
      out.push({ path: data.path, token: data.token });
    }
    return out;
  };

  return { photos: await mint("photo", photoCount), notes: await mint("note", noteCount) };
}

// Cached for just under the URL expiry (audit finding M8): repeated renders of
// the same photo set (the crew screen calls router.refresh on every submit, and
// the EPC dashboard refreshes live) return the same URLs, so the browser image
// cache actually hits instead of re-downloading every photo on weak LTE.
const signPaths = unstable_cache(
  async (paths: string[]): Promise<Record<string, string>> => {
    const db = createAdminClient();
    const { data, error } = await db.storage.from("photos").createSignedUrls(paths, 3600);
    if (error || !data) return {};
    const map: Record<string, string> = {};
    for (const d of data) {
      if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
    }
    return map;
  },
  ["signed-photos"],
  { revalidate: 3000 }
);

// Short-lived signed download URLs for private photos, keyed by storage path.
// MUST only ever receive DB-derived paths already scoped to the caller's
// project. It signs whatever it is handed with the service role, so a
// client-influenced path here would mint a cross-project signed URL.
export async function getSignedPhotoUrlMap(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  // Sorted so the same set produces the same cache key regardless of order.
  return signPaths([...paths].sort());
}

const signDocPaths = unstable_cache(
  async (paths: string[]): Promise<Record<string, string>> => {
    const db = createAdminClient();
    const { data, error } = await db.storage.from("docs").createSignedUrls(paths, 3600);
    if (error || !data) return {};
    const map: Record<string, string> = {};
    for (const d of data) {
      if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
    }
    return map;
  },
  ["signed-docs"],
  { revalidate: 3000 }
);

/**
 * Signed download URLs for compliance documents in the private docs bucket.
 *
 * THE RULE, because this function signs with the service role and therefore
 * grants whatever it is handed: callers may pass ONLY storage paths read from
 * documents rows they were already authorized to load. In practice that means
 * rows where documents.org_id is the caller's own organization, or, for an EPC
 * reader, rows where documents.org_id equals the project's sub_org_id resolved
 * through requireProjectActor.
 *
 * Never pass a path that came from a request, and never pass a path from a
 * documents row loaded without one of those two checks. An A1 certificate
 * carries a named person's identity data; a leaked signed URL to it is a
 * personal data breach, not an inconvenience.
 */
export async function getSignedDocUrlMap(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  return signDocPaths([...paths].sort());
}

/**
 * A signed upload URL for one vault document. The extension is chosen by the
 * caller from the validated mime type, never from the uploaded filename, and
 * the path is namespaced by organization so one company's vault can never
 * receive another's file.
 */
export async function createVaultDocTarget(
  orgId: string,
  extension: string
): Promise<UploadTarget> {
  if (!isUuid(orgId)) throw new Error("Invalid organization id");
  if (!/^[a-z0-9]{2,4}$/.test(extension)) throw new Error("Invalid extension");

  const db = createAdminClient();
  const path = `${orgId}/vault/${randomUUID()}.${extension}`;
  const { data, error } = await db.storage.from("docs").createSignedUploadUrl(path);
  if (error || !data) throw new Error("Could not create upload URL");
  return { path: data.path, token: data.token };
}

/**
 * Stores a generated PDF in the private reports bucket and returns its path.
 *
 * Server generated only: the bytes come from our own renderer, never from a
 * request, so this takes a Buffer rather than minting an upload URL a client
 * could use. upsert is on because regenerating a document (a redraft of a
 * naročilnica before it is sent) must overwrite rather than accumulate
 * orphans; once a document is sent or signed its row stops being editable, so
 * nothing overwrites a document somebody has already accepted.
 */
export async function storeReportPdf(path: string, bytes: Buffer): Promise<string> {
  const db = createAdminClient();
  const { error } = await db.storage.from("reports").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw new Error(`Could not store the document: ${error.message}`);
  return path;
}

/** A signed download URL for one generated document in the reports bucket. */
export async function getSignedReportUrl(path: string, expiresIn = 300): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db.storage.from("reports").createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}
