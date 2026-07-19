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
