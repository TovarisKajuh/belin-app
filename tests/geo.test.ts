import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const geocodePlace = vi.fn();
vi.mock("@/lib/geocode", () => ({ geocodePlace: (...args: unknown[]) => geocodePlace(...args) }));

let row: Record<string, unknown> | null = null;
const updates: string[] = [];
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }),
      update: (patch: unknown) => ({
        eq: () => ({
          is: async (column: string, value: unknown) => {
            updates.push(`${JSON.stringify(patch)} where ${column} is ${value}`);
            return {};
          },
        }),
      }),
    }),
  }),
}));

beforeEach(() => {
  updates.length = 0;
  geocodePlace.mockReset();
});

describe("ensureProjectCoordinates", () => {
  it("returns stored coordinates without asking anyone", async () => {
    row = { lat: 46.1, lng: 14.5, address_zip: "1000", address_city: "Ljubljana", country: "si" };
    const { ensureProjectCoordinates } = await import("@/lib/data/geo");
    expect(await ensureProjectCoordinates("p1")).toEqual({ lat: 46.1, lng: 14.5 });
    expect(geocodePlace).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });
  it("stores a found position only while lat is still empty", async () => {
    row = { lat: null, lng: null, address_zip: "4000", address_city: "Kranj", country: "si" };
    geocodePlace.mockResolvedValue({ lat: 46.24, lng: 14.35 });
    const { ensureProjectCoordinates } = await import("@/lib/data/geo");
    expect(await ensureProjectCoordinates("p1")).toEqual({ lat: 46.24, lng: 14.35 });
    expect(updates).toEqual(['{"lat":46.24,"lng":14.35} where lat is null']);
  });
  it("writes nothing when nothing is found", async () => {
    row = { lat: null, lng: null, address_zip: null, address_city: null, country: "si" };
    geocodePlace.mockResolvedValue(null);
    const { ensureProjectCoordinates } = await import("@/lib/data/geo");
    expect(await ensureProjectCoordinates("p1")).toBeNull();
    expect(updates).toEqual([]);
  });
});
