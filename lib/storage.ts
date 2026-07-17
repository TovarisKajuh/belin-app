import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UploadTarget {
  path: string;
  token: string;
}

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

// Short-lived signed download URLs for private photos, keyed by storage path
// so callers can attach the right URL to the right photo.
export async function getSignedPhotoUrlMap(
  paths: string[],
  expiresIn = 3600
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const db = createAdminClient();
  const { data, error } = await db.storage.from("photos").createSignedUrls(paths, expiresIn);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const d of data) {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  }
  return map;
}
