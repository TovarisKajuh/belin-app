// One tap from an address to directions. Google's documented search URL
// opens the Maps app on iOS and Android, and a browser elsewhere.
export function mapsUrl(p: {
  street: string | null;
  zip: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
}): string | null {
  const base = "https://www.google.com/maps/search/?api=1&query=";
  if (p.lat != null && p.lng != null) return `${base}${p.lat},${p.lng}`;
  const query = [p.street, [p.zip, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return query ? `${base}${encodeURIComponent(query)}` : null;
}
