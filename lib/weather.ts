import "server-only";

export interface WeatherSnapshot {
  tempC: number | null;
  code: number | null;
  capturedAt: string;
}

// Best-effort weather at submit time. Never throws and never hangs: a hard
// timeout means a slow Open-Meteo can never block the crew's submit on weak
// LTE (audit finding H5). On any failure the report still saves with null.
const WEATHER_TIMEOUT_MS = 2500;

export async function fetchWeatherSnapshot(
  lat: number | null,
  lng: number | null
): Promise<WeatherSnapshot | null> {
  if (lat === null || lng === null) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code`;
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    return {
      tempC: json.current?.temperature_2m ?? null,
      code: json.current?.weather_code ?? null,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
