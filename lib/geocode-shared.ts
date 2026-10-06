// Turning a site's postcode and town into coordinates for the weather, the
// pure half. Only postcode, town and country ever leave Belin: never the
// street, never a name. A homeowner's address is personal data; the weather
// grid is kilometres wide and does not need it.

export interface GeocodeInput {
  zip: string | null;
  city: string | null;
  country: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

const COUNTRIES = new Set(["si", "at", "de"]);

export function nominatimQueries(input: GeocodeInput): string[] {
  const country = String(input.country ?? "").toLowerCase();
  if (!COUNTRIES.has(country)) return [];
  const zip = input.zip?.trim() || null;
  const city = input.city?.trim() || null;
  const base = { format: "jsonv2", limit: "1", countrycodes: country };

  const out: string[] = [];
  if (zip && city) out.push(new URLSearchParams({ ...base, postalcode: zip, city }).toString());
  if (zip) out.push(new URLSearchParams({ ...base, postalcode: zip }).toString());
  if (city) out.push(new URLSearchParams({ ...base, city }).toString());
  return out;
}

export function parseNominatim(json: unknown): LatLng | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const first = json[0] as { lat?: unknown; lon?: unknown };
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 };
}
