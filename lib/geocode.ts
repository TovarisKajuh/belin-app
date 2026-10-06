import "server-only";
import { OPERATOR } from "@/lib/legal";
import { nominatimQueries, parseNominatim, type GeocodeInput, type LatLng } from "@/lib/geocode-shared";

// OpenStreetMap Nominatim. Usage policy (read 2026-10-05): at most one request
// per second, an identifying User-Agent, cache the results. Belin asks once
// per project and keeps the answer in projects.lat/lng, which is the cache.
const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = `Belin/1.0 (+https://getbelin.com; ${OPERATOR.email ?? "info@getbelin.com"})`;

async function fetchOne(query: string, timeoutMs: number): Promise<LatLng | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${ENDPOINT}?${query}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return parseNominatim(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Most precise query first; never throws; at most one request per second. */
export async function geocodePlace(
  input: GeocodeInput,
  opts: { timeoutMs?: number; maxQueries?: number; spacingMs?: number } = {},
): Promise<LatLng | null> {
  const queries = nominatimQueries(input).slice(0, opts.maxQueries ?? 3);
  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, opts.spacingMs ?? 1100));
    const hit = await fetchOne(queries[i], opts.timeoutMs ?? 3000);
    if (hit) return hit;
  }
  return null;
}
