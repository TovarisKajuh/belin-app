import { readFileSync } from "node:fs";
import { expect, it, describe } from "vitest";
import { parseK2Text } from "@/lib/k2/k2-shared";
import { moduleItemsFromRoofs, projectDraftFromParse, splitAddress } from "@/lib/k2/k2-project";

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
    // This report carries no article list, but it does state its panels, and a
    // crew still has to confirm those arrived.
    expect(draft.items).toEqual([
      { name: "TSM-455NEG9R.28", qty: 2, unit: "kos", sortOrder: 0 },
    ]);
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
    // 11 K2 articles plus the two panel lines the article list never carries.
    expect(draft.items).toHaveLength(13);
    expect(draft.items[2]).toEqual({
      name: "Wood screw 8x100",
      qty: 272,
      unit: "kos",
      sortOrder: 2,
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

// K2 sells mounting systems, so its article list contains rails, hooks and
// screws and NEVER the panels. A delivery checklist built from that list alone
// omits the biggest item on the truck: the founder caught exactly this on
// 2026-07-20, seeing 11 material rows with no modules among them.
describe("modules reach the material list", () => {
  it("forum1: both panel types lead the list, before any K2 hardware", () => {
    const draft = projectDraftFromParse(parseK2Text(load("forum1")), {
      fallbackCountry: "si",
      locale: "sl",
    });

    expect(draft.items[0]).toEqual({
      name: "AIKO-A455-MAH54Db",
      qty: 41,
      unit: "kos",
      sortOrder: 0,
    });
    expect(draft.items[1]).toEqual({
      name: "AIKO-A460-MAH54Db",
      qty: 16,
      unit: "kos",
      sortOrder: 1,
    });

    // 11 K2 articles plus the two panel lines, and the panels add up to the
    // project total the plan prints.
    expect(draft.items).toHaveLength(13);
    expect(draft.items[2].name).toBe("Wood screw 8x100");
    expect(draft.items[0].qty + draft.items[1].qty).toBe(57);
  });

  it("k2-report-2025: a report with no article list still yields its panels", () => {
    const draft = projectDraftFromParse(parseK2Text(load("k2-report-2025")), {
      fallbackCountry: "si",
      locale: "sl",
    });

    expect(draft.items).toHaveLength(1);
    expect(draft.items[0].qty).toBe(2);
    expect(draft.items[0].name).toBe("TSM-455NEG9R.28");
  });

  // UPGRADED by the hardening plan: the breadcrumb grammar recovers this
  // report's area, which the shipped parser declared unrecoverable. The panels
  // now come from the roof rather than from the project total fallback, and the
  // count is the same either way, which is the point.
  it("k2-report-2023: the merged row era now yields its roof and its panels", () => {
    const draft = projectDraftFromParse(parseK2Text(load("k2-report-2023")), {
      fallbackCountry: "si",
      locale: "sl",
    });

    expect(draft.roofs).toHaveLength(1);
    expect(draft.roofs[0].name).toBe("Dach 1");
    expect(draft.roofs[0].moduleCount).toBe(16);
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0].qty).toBe(16);
    // A merged row carries no module name, so the panel line falls back to the
    // generic word rather than to a scrap of the table header.
    expect(draft.items[0].name).toBe("Modul");
  });

  it("groups roofs that carry the same panel into one line", () => {
    const items = moduleItemsFromRoofs(
      [
        { name: "Dach 1", moduleCount: 10, kwp: null, moduleType: "AIKO-A455 (1757x1134x30)" },
        { name: "Dach 2", moduleCount: 6, kwp: null, moduleType: "AIKO-A455 (1757x1134x30)" },
      ],
      { moduleCount: 16, moduleType: null },
    );

    expect(items).toEqual([{ name: "AIKO-A455", qty: 16, unit: "kos", sortOrder: 0 }]);
  });

  it("falls back to a generic name when the panel is not identified", () => {
    const items = moduleItemsFromRoofs([], { moduleCount: 12, moduleType: null });
    expect(items).toEqual([{ name: "Modul", qty: 12, unit: "kos", sortOrder: 0 }]);
  });

  it("adds nothing when the plan knows of no panels at all", () => {
    expect(moduleItemsFromRoofs([], { moduleCount: null, moduleType: null })).toEqual([]);
    expect(moduleItemsFromRoofs([], { moduleCount: 0, moduleType: "X" })).toEqual([]);
  });
});
