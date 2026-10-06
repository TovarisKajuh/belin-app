import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatAddressLine,
  normalizeVat,
  parseViesResponse,
  slovenianCase,
} from "@/lib/vies-shared";

vi.mock("server-only", () => ({}));

// Real VIES answers captured on 2026-10-05 unless marked constructed.
const PETROL = { valid: true, name: "PETROL D.D., LJUBLJANA", address: "DUNAJSKA CESTA 050, LJUBLJANA, 1000 LJUBLJANA" };
const KRKA = { valid: true, name: "KRKA, D.D., NOVO MESTO", address: "ŠMARJEŠKA CESTA 6, 8501 NOVO MESTO" };
const TELEKOM = { valid: true, name: "TELEKOM SLOVENIJE, D.D.", address: "CIGALETOVA ULICA 015, LJUBLJANA, 1000 LJUBLJANA" };
// Constructed: a settlement that differs from the post town, and a house number with a letter.
const SETTLEMENT = { valid: true, name: "SONČNA STREHA D.O.O.", address: "CESTA NA BRDO 017A, VRHOVCI, 1000 LJUBLJANA" };
const VERBUND = { valid: true, name: "VERBUND AG", address: "Am Hof 6a\nAT-1010 Wien" };
// Constructed: Germany confirms validity but never publishes name or address.
const DE_VALID = { valid: true, name: "---", address: "---" };
const SI_INVALID = { valid: false, name: "---", address: "---" };
const SI_INVALID_EMPTY = { valid: false, name: "", address: "" };
const DE_DOWN = { actionSucceed: false, errorWrappers: [{ error: "MS_UNAVAILABLE" }] };

describe("normalizeVat", () => {
  it("reads a Slovenian number with or without prefix and spaces", () => {
    expect(normalizeVat("SI 8026 7432", "si")).toEqual({ country: "si", number: "80267432", display: "SI80267432" });
    expect(normalizeVat("80267432", "si")).toEqual({ country: "si", number: "80267432", display: "SI80267432" });
  });
  it("lets the prefix win over the selected country", () => {
    expect(normalizeVat("ATU14703908", "si")).toEqual({ country: "at", number: "U14703908", display: "ATU14703908" });
    expect(normalizeVat("de129273398", "si")).toEqual({ country: "de", number: "129273398", display: "DE129273398" });
  });
  it("adds the U an Austrian number always carries", () => {
    expect(normalizeVat("14703908", "at")?.display).toBe("ATU14703908");
  });
  it("refuses what cannot be a number of that country", () => {
    expect(normalizeVat("SI1234", "si")).toBeNull();
    expect(normalizeVat("", "si")).toBeNull();
    expect(normalizeVat("XX12345678", "si")).toBeNull();
    expect(normalizeVat("DE12345678", "si")).toBeNull();
  });
});

describe("parseViesResponse", () => {
  it("title-cases a Slovenian answer and strips the zero padding", () => {
    expect(parseViesResponse(PETROL, "si")).toEqual({
      valid: true, name: "Petrol d.d., Ljubljana", street: "Dunajska cesta 50", postcode: "1000", city: "Ljubljana",
    });
  });
  it("keeps Slovenian generic words and multi-word towns lower case", () => {
    expect(parseViesResponse(KRKA, "si")).toEqual({
      valid: true, name: "Krka, d.d., Novo mesto", street: "Šmarješka cesta 6", postcode: "8501", city: "Novo mesto",
    });
    expect(parseViesResponse(TELEKOM, "si")?.street).toBe("Cigaletova ulica 15");
  });
  it("keeps a settlement that differs from the post town and lower-cases the house letter", () => {
    expect(parseViesResponse(SETTLEMENT, "si")).toEqual({
      valid: true, name: "Sončna Streha d.o.o.", street: "Cesta na Brdo 17a, Vrhovci", postcode: "1000", city: "Ljubljana",
    });
  });
  it("leaves an Austrian answer as written and drops the country prefix of the postcode", () => {
    expect(parseViesResponse(VERBUND, "at")).toEqual({
      valid: true, name: "VERBUND AG", street: "Am Hof 6a", postcode: "1010", city: "Wien",
    });
  });
  it("says valid with no data for Germany", () => {
    expect(parseViesResponse(DE_VALID, "de")).toEqual({ valid: true, name: null, street: null, postcode: null, city: null });
  });
  it("says invalid for a number VIES does not know", () => {
    const invalid = { valid: false, name: null, street: null, postcode: null, city: null };
    expect(parseViesResponse(SI_INVALID, "si")).toEqual(invalid);
    expect(parseViesResponse(SI_INVALID_EMPTY, "si")).toEqual(invalid);
  });
  it("returns null when the member state is down or the body is garbage", () => {
    expect(parseViesResponse(DE_DOWN, "de")).toBeNull();
    expect(parseViesResponse("<html>", "si")).toBeNull();
    expect(parseViesResponse({ name: "X" }, "si")).toBeNull();
  });
});

describe("slovenianCase and formatAddressLine", () => {
  it("handles towns with prepositions", () => {
    expect(slovenianCase("RAVNE NA KOROŠKEM")).toBe("Ravne na Koroškem");
    expect(slovenianCase("MURSKA SOBOTA")).toBe("Murska Sobota");
  });
  it("joins the parts into one line and skips what is missing", () => {
    expect(formatAddressLine({ street: "Dunajska cesta 50", postcode: "1000", city: "Ljubljana" })).toBe("Dunajska cesta 50, 1000 Ljubljana");
    expect(formatAddressLine({ street: null, postcode: "1010", city: "Wien" })).toBe("1010 Wien");
    expect(formatAddressLine({ street: null, postcode: null, city: null })).toBeNull();
  });
});

describe("lookupVat", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts the country code and number, and parses the answer", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(PETROL), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { lookupVat } = await import("@/lib/vies");
    const result = await lookupVat({ country: "si", number: "80267432", display: "SI80267432" });
    expect(result?.name).toBe("Petrol d.d., Ljubljana");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ countryCode: "SI", vatNumber: "80267432" });
  });
  it("never throws: a network error or a 500 is null", async () => {
    const { lookupVat } = await import("@/lib/vies");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect(await lookupVat({ country: "si", number: "80267432", display: "SI80267432" })).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 500 })));
    expect(await lookupVat({ country: "si", number: "80267432", display: "SI80267432" })).toBeNull();
  });
  it("gives up at the timeout", async () => {
    const { lookupVat } = await import("@/lib/vies");
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })));
    const started = Date.now();
    expect(await lookupVat({ country: "si", number: "80267432", display: "SI80267432" }, 50)).toBeNull();
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
