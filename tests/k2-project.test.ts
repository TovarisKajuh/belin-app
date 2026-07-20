import { readFileSync } from "node:fs";
import { expect, it, describe } from "vitest";
import { parseK2Text } from "@/lib/k2/k2-shared";
import { projectDraftFromParse, splitAddress } from "@/lib/k2/k2-project";

const load = (n: string) =>
  (JSON.parse(readFileSync(`tests/fixtures/k2/text/${n}.pages.json`, "utf8")) as {
    pages: string[];
  }).pages;

describe("splitAddress", () => {
  it("splits the street, zip and city form", () => {
    expect(splitAddress("Berliner Ch 11, 39307 Genthin")).toEqual({
      street: "Berliner Ch 11",
      zip: "39307",
      city: "Genthin",
      country: null,
    });
  });

  it("splits the zip, city, country form with no street", () => {
    expect(splitAddress("74321 Bietigheim-Bissingen, Deutschland")).toEqual({
      street: null,
      zip: "74321",
      city: "Bietigheim-Bissingen",
      country: "de",
    });
  });

  it("recognizes Slovenian and Austrian country names", () => {
    expect(splitAddress("1000 Ljubljana, Slovenija").country).toBe("si");
    expect(splitAddress("1010 Wien, Österreich").country).toBe("at");
  });

  it("keeps an unsplittable address as the street rather than losing it", () => {
    expect(splitAddress("Neko dvorisce brez postne stevilke")).toEqual({
      street: "Neko dvorisce brez postne stevilke",
      zip: null,
      city: null,
      country: null,
    });
  });

  it("never throws on junk", () => {
    expect(() => splitAddress("")).not.toThrow();
    expect(() => splitAddress(",,,")).not.toThrow();
    expect(splitAddress("")).toEqual({ street: null, zip: null, city: null, country: null });
  });
});

describe("projectDraftFromParse", () => {
  it("fills a draft from the 2025 report", () => {
    const draft = projectDraftFromParse(parseK2Text(load("k2-report-2025")), {
      fallbackCountry: "si",
      locale: "sl",
    });

    expect(draft.name).toBe("2 Module in Reihe");
    expect(draft.addressStreet).toBe("Berliner Ch 11");
    expect(draft.addressZip).toBe("39307");
    expect(draft.addressCity).toBe("Genthin");
    expect(draft.kwp).toBe(0.91);
    expect(draft.moduleCount).toBe(2);
    expect(draft.mountingSystem).toBe("SingleRail");
    expect(draft.roofType).toBe("Ziegel");
    expect(draft.language).toBe("sl");
    expect(draft.country).toBe("si"); // no country in the address, so the EPC's own
    expect(draft.items).toEqual([]); // this report carries no article list
  });

  it("takes the country from the address when the plan states one", () => {
    const draft = projectDraftFromParse(parseK2Text(load("forum1")), {
      fallbackCountry: "si",
      locale: "sl",
    });

    expect(draft.country).toBe("de"); // "..., Deutschland" beats the EPC default
    expect(draft.addressCity).toBe("Bietigheim-Bissingen");
    expect(draft.kwp).toBe(26.02);
    expect(draft.moduleCount).toBe(57);
    expect(draft.items).toHaveLength(11);
    expect(draft.items[0]).toEqual({
      name: "Wood screw 8x100",
      qty: 272,
      unit: "kos",
      sortOrder: 0,
    });
  });

  it("a non K2 file yields an empty but usable draft", () => {
    const draft = projectDraftFromParse(parseK2Text(load("k2-base-report-annotations")), {
      fallbackCountry: "si",
      locale: "sl",
    });

    expect(draft.name).toBe("");
    expect(draft.country).toBe("si");
    expect(draft.items).toEqual([]);
    expect(draft.kwp).toBeNull();
  });

  it("never throws", () => {
    expect(() =>
      projectDraftFromParse(parseK2Text([]), { fallbackCountry: "si", locale: "sl" }),
    ).not.toThrow();
  });
});
