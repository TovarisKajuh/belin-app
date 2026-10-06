import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { geocodePlace } from "@/lib/geocode";
import type { LatLng } from "@/lib/geocode-shared";

/**
 * The project's coordinates, finding and storing them the first time they are
 * needed. The write is conditional on lat still being null, so a seeded or
 * hand-corrected position is never overwritten by a guess.
 */
export async function ensureProjectCoordinates(
  projectId: string,
  opts: { timeoutMs?: number; maxQueries?: number } = {},
): Promise<LatLng | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("projects")
    .select("lat, lng, address_zip, address_city, country")
    .eq("id", projectId)
    .maybeSingle();
  if (!data) return null;
  if (data.lat !== null && data.lng !== null) return { lat: data.lat, lng: data.lng };

  const hit = await geocodePlace({ zip: data.address_zip, city: data.address_city, country: data.country }, opts);
  if (!hit) return null;
  await db.from("projects").update({ lat: hit.lat, lng: hit.lng }).eq("id", projectId).is("lat", null);
  return hit;
}
