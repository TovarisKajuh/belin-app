import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
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
export async function getSignedPhotoUrlMap(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  // Sorted so the same set produces the same cache key regardless of order.
  return signPaths([...paths].sort());
}
