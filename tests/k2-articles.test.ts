import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { extractArticleLists, selectItems } from "@/lib/k2/k2-articles";

const load = (n: string) =>
  (JSON.parse(readFileSync(`tests/fixtures/k2/text/${n}.pages.json`, "utf8")) as {
    pages: string[];
  }).pages;

it("forum2: one total list, 8 exact rows", () => {
  const pages = extractArticleLists(load("forum2"));
  expect(pages).toHaveLength(1);
  expect(pages[0].scope).toEqual({ kind: "total" });
  expect(pages[0].summeKg).toBe(58.5);

  const { items, warnings } = selectItems(pages);
  expect(warnings).toEqual([]);
  expect(items).toHaveLength(8);
  expect(items[0]).toEqual({
    position: 1,
    articleNo: "2003215",
    name: "SingleHook 3S",
    qty: 36,
    weightKg: 19.1,
  });
  expect(items[1].name).toBe("Wood screw 8×160"); // unicode multiplication sign preserved
  expect(items[6]).toEqual({
    position: 7,
    articleNo: "2003222",
    name: "SingleRail 36; 4.40 m", // semicolon and period decimal inside the name
    qty: 9,
    weightKg: 30.5,
  });
});

it("forum1: the total list wins over the two roof lists", () => {
  const pages = extractArticleLists(load("forum1"));
  expect(pages.map((p) => p.scope)).toEqual([
    { kind: "roof", n: 1 },
    { kind: "roof", n: 3 },
    { kind: "total" },
  ]);

  const { items, warnings } = selectItems(pages);
  expect(items).toHaveLength(11);
  expect(warnings).toEqual([]);

  const summe = pages[2].summeKg!;
  expect(summe).toBe(292.9);
  expect(pages[0].summeKg! + pages[1].summeKg!).toBeCloseTo(summe, 1); // 207,0 + 85,9
});

it("forum1 without its total page: per roof aggregation with a warning", () => {
  const pages = extractArticleLists(load("forum1")).filter((p) => p.scope.kind === "roof");
  const { items, warnings } = selectItems(pages);

  expect(warnings).toContain("per_roof_fallback");
  expect(items).toHaveLength(11);

  const screws = items.find((i) => i.articleNo === "2004112")!;
  expect(screws.qty).toBe(272); // 188 + 84
  expect(screws.weightKg).toBeCloseTo(7.4, 1); // 5,1 + 2,3
  expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

it("reports without lists yield no article pages", () => {
  expect(extractArticleLists(load("k2-report-2025"))).toHaveLength(0);
  expect(extractArticleLists(load("k2-report-2023"))).toHaveLength(0);
  expect(extractArticleLists(load("k2-base-report-annotations"))).toHaveLength(0);
});

it("selectItems on nothing warns no_articles", () => {
  const { items, warnings } = selectItems([]);
  expect(items).toEqual([]);
  expect(warnings).toEqual(["no_articles"]);
});

it("a total list spanning two pages concatenates in page order", () => {
  const real = load("forum2");
  const extra = [
    "12 2004115 Wood screw 8×160 10 0,4 kg",
    "Summe 0,4 kg",
    "| Connecting Strength",
    "Artikelliste",
    "K2 Base Report 3.1.97.0 | 19.09.2023 | Neues Projekt 19/19",
  ].join("\n");

  const { items } = selectItems(extractArticleLists([...real.slice(0, 18), extra]));
  expect(items).toHaveLength(9);
  expect(items[8].articleNo).toBe("2004115");
  expect(items[8].position).toBe(9); // renumbered, not the printed 12
});

it("weight mismatch is a warning, not a failure", () => {
  const doctored = [
    [
      "1 2003215 SingleHook 3S 36 19,1 kg",
      "Summe 99,9 kg",
      "| Connecting Strength",
      "Artikelliste",
      "K2 Base Report x | 01.01.2025 | T 1/1",
    ].join("\n"),
  ];

  const { warnings, items } = selectItems(extractArticleLists(doctored));
  expect(items).toHaveLength(1);
  expect(warnings).toContain("weight_mismatch");
});

it("an unrecognized breadcrumb is treated as a total list", () => {
  const foreign = [
    [
      "1 2003215 SingleHook 3S 36 19,1 kg",
      "Summe 19,1 kg",
      "| Connecting Strength",
      "Seznam artiklov", // a future language variant
    ].join("\n"),
  ];

  const pages = extractArticleLists(foreign);
  expect(pages[0].scope).toEqual({ kind: "unknown" });
  const { items, warnings } = selectItems(pages);
  expect(items).toHaveLength(1);
  expect(warnings).toEqual([]);
});

it("a row wrapped onto the next line is rejoined once", () => {
  const wrapped = [
    [
      "1 2003222 SingleRail 36;",
      "4.40 m 9 30,5 kg",
      "Summe 30,5 kg",
      "| Connecting Strength",
      "Artikelliste",
    ].join("\n"),
  ];

  const { items } = selectItems(extractArticleLists(wrapped));
  expect(items).toHaveLength(1);
  expect(items[0].name).toBe("SingleRail 36; 4.40 m");
});

it("never throws on junk", () => {
  expect(() => extractArticleLists([])).not.toThrow();
  expect(() => extractArticleLists(["", "\n\n\n", "1 2 3"])).not.toThrow();
  expect(() => selectItems([])).not.toThrow();
});
