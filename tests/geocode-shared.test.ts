import { describe, expect, it } from "vitest";
import { nominatimQueries, parseNominatim } from "@/lib/geocode-shared";

describe("nominatimQueries", () => {
  it("tries postcode and town, then postcode, then town, never a street", () => {
    const q = nominatimQueries({ zip: "4000", city: "Kranj", country: "si" }).map((s) => new URLSearchParams(s));
    expect(q).toHaveLength(3);
    expect(q[0].get("postalcode")).toBe("4000");
    expect(q[0].get("city")).toBe("Kranj");
    expect(q[0].get("countrycodes")).toBe("si");
    expect(q[0].get("format")).toBe("jsonv2");
    expect(q[1].get("city")).toBeNull();
    expect(q[2].get("postalcode")).toBeNull();
    expect(q.every((p) => p.get("street") === null && p.get("q") === null)).toBe(true);
  });
  it("asks nothing it cannot ask", () => {
    expect(nominatimQueries({ zip: null, city: null, country: "si" })).toEqual([]);
    expect(nominatimQueries({ zip: "4000", city: "Kranj", country: "fr" })).toEqual([]);
    expect(nominatimQueries({ zip: " ", city: "Genthin", country: "DE" })).toHaveLength(1);
  });
});

describe("parseNominatim", () => {
  it("reads the first hit and rounds to five decimals", () => {
    expect(parseNominatim([{ lat: "46.2432913", lon: "14.3549353" }])).toEqual({ lat: 46.24329, lng: 14.35494 });
  });
  it("refuses empty, broken and impossible answers", () => {
    expect(parseNominatim([])).toBeNull();
    expect(parseNominatim({})).toBeNull();
    expect(parseNominatim([{ lat: "x", lon: "14" }])).toBeNull();
    expect(parseNominatim([{ lat: "95", lon: "14" }])).toBeNull();
  });
});
