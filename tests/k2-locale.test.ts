import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inferLocale, parseLocaleDate, parseLocaleNumber, LOCALES } from "@/lib/k2/k2-locale";
import { detectK2, parseFooters } from "@/lib/k2/k2-shared";

const load = (n: string) =>
  (JSON.parse(readFileSync(`tests/fixtures/k2/text/${n}.pages.json`, "utf8")) as {
    pages: string[];
  }).pages;

describe("parseLocaleNumber, english", () => {
  // Every value is lifted from kadir-trainer-projekt, the English export.
  const cases: [string, number | null][] = [
    ["0.6", 0.6], // row weight
    ["94.6", 94.6], // "Total 94.6 kg"
    ["10.00", 10], // "Total 20 10.00 kWp"
    ["1,961", 1961], // module dimension: comma is THOUSANDS in english
    ["26.7", 26.7], // basic wind speed
    ["0.900", 0.9], // rafter spacing
    ["47.6", 47.6],
    ["112", 112],
    ["", null],
    ["-", null],
    ["kg", null],
  ];

  it.each(cases)("en %j -> %j", (raw, want) => {
    expect(parseLocaleNumber(raw, "en")).toBe(want);
  });
});

describe("parseLocaleNumber, german", () => {
  // The shipped rules, including the period ambiguity that german reports need
  // because they print period decimals in kWp cells and in Dachneigung.
  const cases: [string, number | null][] = [
    ["292,9", 292.9],
    ["26,02", 26.02],
    ["1.234,5", 1234.5],
    ["2.700", 2700], // period with 3 trailing digits is thousands
    ["8.1", 8.1], // engelmeier Dachneigung, period DECIMAL
    ["5.34", 5.34], // martin-lang kWp cell
    // THE HAZARD, pinned deliberately: petra's kWp cell prints "4.005" meaning
    // 4.005 kWp, but the German thousands rule reads three trailing digits as a
    // grouping separator and yields 4005. That is correct for this function and
    // wrong for that cell, which is exactly why roof kWp is computed from
    // wattage times count and never parsed from the cell when a Wp line exists.
    ["4.005", 4005],
    ["", null],
    ["kg", null],
  ];

  it.each(cases)("de %j -> %j", (raw, want) => {
    expect(parseLocaleNumber(raw, "de")).toBe(want);
  });
});

describe("parseLocaleDate", () => {
  it("reads both separators, day first", () => {
    expect(parseLocaleDate("24.03.2026")).toBe("2026-03-24");
    expect(parseLocaleDate("24/03/2026")).toBe("2026-03-24");
    expect(parseLocaleDate("04.03.2026")).toBe("2026-03-04");
  });

  it("never throws on junk", () => {
    expect(parseLocaleDate("")).toBeNull();
    expect(parseLocaleDate("nonsense")).toBeNull();
    expect(() => parseLocaleDate("//")).not.toThrow();
  });
});

describe("inferLocale", () => {
  it("reads english from the slash dated footer", () => {
    const pages = load("kadir-trainer-projekt");
    expect(inferLocale(pages, parseFooters(pages))).toBe("en");
  });

  it.each([
    "k2-report-2025",
    "k2-report-2023",
    "forum1",
    "forum2",
    "martin-lang",
    "petra-ullrich",
    "planung-engelmeier",
    "thomas-woginger",
  ])("reads german from %s", (name) => {
    const pages = load(name);
    expect(inferLocale(pages, parseFooters(pages))).toBe("de");
  });

  it("falls back to german when there is nothing to go on", () => {
    expect(inferLocale([], [])).toBe("de");
    expect(inferLocale(["nothing useful"], [])).toBe("de");
  });
});

describe("detectK2 with language", () => {
  it("accepts the english report the shipped parser rejected", () => {
    expect(detectK2(load("kadir-trainer-projekt"))).toEqual({
      isK2: true,
      version: "3.2.81.0",
      lang: "en",
    });
  });

  it.each([
    ["k2-report-2025", "3.2.28.0"],
    ["k2-report-2023", "3.1.97.0"],
    ["forum1", "3.2.21.1"],
    ["forum2", "3.1.97.0"],
    ["martin-lang", "3.2.79.0"],
    ["petra-ullrich", "3.2.78.0"],
    ["planung-engelmeier", "3.2.79.0"],
    ["thomas-woginger", "3.2.79.0"],
  ])("detects %s as german %s", (name, version) => {
    expect(detectK2(load(name))).toEqual({ isK2: true, version, lang: "de" });
  });

  it("still rejects the annotations document and junk", () => {
    expect(detectK2(load("k2-base-report-annotations"))).toEqual({
      isK2: false,
      version: null,
      lang: null,
    });
    expect(detectK2([])).toEqual({ isK2: false, version: null, lang: null });
  });
});

describe("locale packs", () => {
  it("carry the same key set in both languages", () => {
    expect(Object.keys(LOCALES.en.terms).sort()).toEqual(Object.keys(LOCALES.de.terms).sort());
    expect(Object.keys(LOCALES.en.labels).sort()).toEqual(Object.keys(LOCALES.de.labels).sort());
  });
});
