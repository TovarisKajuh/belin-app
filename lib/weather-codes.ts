// WMO weather codes (Open-Meteo) collapsed into the six labels the crew sees.
// Kept pure and framework-free so it is unit tested and reused on server and client.
export function weatherCodeToKey(code: number | null): string {
  if (code === null || code === undefined) return "unknown";
  if (code === 0) return "clear";
  if (code <= 3) return "partly";
  if (code <= 48) return "fog";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "snow";
  return "storm";
}
