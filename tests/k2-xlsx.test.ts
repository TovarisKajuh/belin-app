import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { parseK2Xlsx } from "@/lib/k2/k2-xlsx";

const bytes = (p: string) => new Uint8Array(readFileSync(p));

it("parses the article list export", async () => {
  const r = await parseK2Xlsx(bytes("tests/fixtures/k2/articles.xlsx"));

  expect(r.ok).toBe(true);
  expect(r.items).toHaveLength(3); // the Summe row is not an item
  expect(r.items[0]).toEqual({
    position: 1,
    articleNo: "2003215",
    name: "SingleHook 3S",
    qty: 36,
    weightKg: 19.1,
  });
  expect(r.items[1].name).toBe("Wood screw 8×160");
  expect(r.items[2]).toEqual({
    position: 3,
    articleNo: "2003222",
    name: "SingleRail 36; 4.40 m",
    qty: 9,
    weightKg: 30.5,
  });
});

it("carries no metadata: the Excel export has none to give", async () => {
  const r = await parseK2Xlsx(bytes("tests/fixtures/k2/articles.xlsx"));
  expect(r.metadata.projectName).toBeNull();
  expect(r.metadata.kwpTotal).toBeNull();
  expect(r.metadata.roofs).toEqual([]);
  expect(r.warnings).toContain("meta_incomplete");
});

it("finds the header row wherever it sits", async () => {
  const r = await parseK2Xlsx(bytes("tests/fixtures/k2/articles-shifted.xlsx"));
  expect(r.ok).toBe(true);
  expect(r.items).toHaveLength(1);
  expect(r.items[0].articleNo).toBe("2003215");
});

it("never throws on garbage bytes", async () => {
  const r = await parseK2Xlsx(new Uint8Array([1, 2, 3, 4]));
  expect(r.ok).toBe(false);
  expect(r.items).toEqual([]);
});

it("never throws on empty bytes", async () => {
  const r = await parseK2Xlsx(new Uint8Array([]));
  expect(r.ok).toBe(false);
});

it("a workbook with no article table is not ok", async () => {
  const r = await parseK2Xlsx(bytes("tests/fixtures/k2/forum2.pdf")); // a PDF, not a workbook
  expect(r.ok).toBe(false);
});

it("reads an english export's headers", () => {
  // "Item no." and "Item description" are the same columns as "Art.-Nr." and
  // "Artikel". Synthetic like the others: still no real K2 Excel export exists.
  return parseK2Xlsx(bytes("tests/fixtures/k2/articles-english.xlsx")).then((r) => {
    expect(r.ok).toBe(true);
    expect(r.items).toHaveLength(2);
    expect(r.items[0].name).toBe("Wood screw 8x100");
    expect(r.items[0].qty).toBe(112);
  });
});
