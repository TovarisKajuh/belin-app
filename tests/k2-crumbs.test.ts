import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyCrumb, enumerateAreas } from "@/lib/k2/k2-crumbs";
import { LOCALES } from "@/lib/k2/k2-locale";

const load = (n: string) =>
  (JSON.parse(readFileSync(`tests/fixtures/k2/text/${n}.pages.json`, "utf8")) as {
    pages: string[];
  }).pages;

const de = LOCALES.de;
const en = LOCALES.en;

describe("classifyCrumb, german", () => {
  it("reads the project total list", () => {
    expect(classifyCrumb("Artikelliste", de)).toEqual({ kind: "bomTotal" });
  });

  it("reads a per area list in both era spellings", () => {
    // 3.2.2x nests the area under the roofs section, 3.2.7x does not.
    expect(classifyCrumb("Dächer | Dach 1 | Artikelliste", de)).toEqual({
      kind: "bomArea",
      area: "Dach 1",
    });
    expect(classifyCrumb("Bereich 1 | Artikelliste", de)).toEqual({
      kind: "bomArea",
      area: "Bereich 1",
    });
  });

  it("reads statics and results", () => {
    expect(classifyCrumb("Statikbericht | Bereich 2", de)).toEqual({
      kind: "statics",
      area: "Bereich 2",
    });
    expect(classifyCrumb("Ergebnisse | Dach 1", de)).toEqual({ kind: "results", area: "Dach 1" });
  });

  it("strips the roofs section from an assembly crumb", () => {
    // Without this the old era enumerates a bogus "Dächer | Dach 1" alongside
    // the real "Dach 1", the counts stop matching the overview rows, and every
    // roof loses its panel count.
    expect(classifyCrumb("Dächer | Dach 1 | Montageplan", de)).toEqual({
      kind: "assembly",
      area: "Dach 1",
    });
    expect(classifyCrumb("Bereich 1 | Montageplan", de)).toEqual({
      kind: "assembly",
      area: "Bereich 1",
    });
  });

  it("keeps a planner's own multi word area name intact", () => {
    expect(
      classifyCrumb("Block 01 - Gezeichnete Belegungsfläche 01 | Artikelliste", de),
    ).toEqual({ kind: "bomArea", area: "Block 01 - Gezeichnete Belegungsfläche 01" });
  });

  it("tolerates the dangling pipe a truncated crumb leaves behind", () => {
    expect(classifyCrumb("Block 01 - Gezeichnete Belegungsfläche 01 | Modulfeld 1 |", de).kind).toBe(
      "other",
    );
  });

  it("treats single segment crumbs as furniture, never as areas", () => {
    // These collide with project names, reseller ads and section intros.
    for (const crumb of ["Bereich 1", "Inhalt", "Über uns", "www.Photovoltaik4all.de", "Dächer"]) {
      expect(classifyCrumb(crumb, de).kind).toBe("other");
    }
  });

  it("reads the overview", () => {
    expect(classifyCrumb("Projektübersicht", de)).toEqual({ kind: "overview" });
  });
});

describe("classifyCrumb, english", () => {
  it("mirrors every rule", () => {
    expect(classifyCrumb("Bill of material", en)).toEqual({ kind: "bomTotal" });
    expect(classifyCrumb("Area 1 | Bill of material", en)).toEqual({
      kind: "bomArea",
      area: "Area 1",
    });
    expect(classifyCrumb("Structural analysis report | Area 1", en)).toEqual({
      kind: "statics",
      area: "Area 1",
    });
    expect(classifyCrumb("Results | Area 1", en)).toEqual({ kind: "results", area: "Area 1" });
    expect(classifyCrumb("Area 1 | Assembly plan", en)).toEqual({
      kind: "assembly",
      area: "Area 1",
    });
    expect(classifyCrumb("Project overview", en)).toEqual({ kind: "overview" });
    expect(classifyCrumb("Kadir Trainer Projekt", en).kind).toBe("other");
    expect(classifyCrumb("Area 1 | Module array 1 | Module block 1", en).kind).toBe("other");
  });
});

// The whole point of the grammar: these ten area lists are produced without a
// single hardcoded area word, across three K2 eras and two languages.
describe("enumerateAreas over every fixture", () => {
  const cases: [string, "de" | "en", string[]][] = [
    ["forum1", "de", ["Dach 1", "Dach 3"]],
    ["forum2", "de", ["Dach 1"]],
    ["k2-report-2025", "de", ["Dach 1"]],
    ["k2-report-2023", "de", ["Dach 1"]],
    ["martin-lang", "de", ["Bereich 1", "Bereich 2"]],
    ["petra-ullrich", "de", ["Bereich 1", "Bereich 2"]],
    ["thomas-woginger", "de", ["Bereich 1", "Bereich 2"]],
    ["planung-engelmeier", "de", ["Block 01 - Gezeichnete Belegungsfläche 01"]],
    ["kadir-trainer-projekt", "en", ["Area 1"]],
    ["k2-base-report-annotations", "de", []],
  ];

  it.each(cases)("%s yields %j", (name, lang, expected) => {
    expect(enumerateAreas(load(name), LOCALES[lang])).toEqual(expected);
  });
});

describe("totality", () => {
  it("never throws", () => {
    expect(() => classifyCrumb("", de)).not.toThrow();
    expect(() => classifyCrumb("| | |", de)).not.toThrow();
    expect(() => enumerateAreas([], de)).not.toThrow();
    expect(enumerateAreas([], de)).toEqual([]);
  });
});
