import "server-only";

export interface WeatherSnapshot {
  tempC: number | null;
  code: number | null;
  capturedAt: string;
}

// Best-effort weather at submit time. Never throws: on any failure the report
// still saves with a null snapshot. Open-Meteo needs no API key.
export async function fetchWeatherSnapshot(
  lat: number | null,
  lng: number | null
): Promise<WeatherSnapshot | null> {
  if (lat === null || lng === null) return null;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code`;
    const res = await fetch(url, { cache: "no-store" });
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
