import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => vi.unstubAllGlobals());

describe("geocodePlace", () => {
  it("falls through to the next query and identifies itself", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("[]", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ lat: "52.40", lon: "12.16" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { geocodePlace } = await import("@/lib/geocode");
    const hit = await geocodePlace({ zip: "39307", city: "Genthin", country: "de" }, { spacingMs: 0 });
    expect(hit).toEqual({ lat: 52.4, lng: 12.16 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(String((init.headers as Record<string, string>)["User-Agent"])).toMatch(/^Belin\//);
  });
  it("never throws and respects maxQueries", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fetchMock);
    const { geocodePlace } = await import("@/lib/geocode");
    expect(await geocodePlace({ zip: "4000", city: "Kranj", country: "si" }, { spacingMs: 0, maxQueries: 1 })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
