import { describe, expect, it } from "vitest";
import { mapsUrl } from "@/lib/maps";

describe("mapsUrl", () => {
  it("prefers the coordinates, which point at the roof rather than the street", () => {
    expect(mapsUrl({ street: "Cesta 1", zip: "4000", city: "Kranj", lat: 46.2389, lng: 14.3556 })).toBe(
      "https://www.google.com/maps/search/?api=1&query=46.2389,14.3556",
    );
  });
  it("falls back to the address, encoded", () => {
    expect(mapsUrl({ street: "Cesta Staneta Žagarja 69", zip: "4000", city: "Kranj", lat: null, lng: null })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Cesta%20Staneta%20%C5%BDagarja%2069%2C%204000%20Kranj",
    );
  });
  it("is null with nothing to point at", () => {
    expect(mapsUrl({ street: null, zip: null, city: null, lat: null, lng: null })).toBeNull();
  });
});
