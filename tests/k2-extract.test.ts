// Integration test: reads the real PDFs. Its only job is to detect unpdf
// extraction drift. All parsing logic is tested against the frozen texts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";

// Every fixture and the page count it must keep producing. A change here means
// either a replaced file or an unpdf upgrade that reads documents differently.
const PAGE_COUNTS: [string, number][] = [
  ["k2-report-2025", 17],
  ["k2-report-2023", 18],
  ["k2-base-report-annotations", 10],
  ["forum1", 35],
  ["forum2", 19],
  ["kadir-trainer-projekt", 18],
  ["martin-lang", 46],
  ["petra-ullrich", 34],
  ["planung-engelmeier", 22],
  ["thomas-woginger", 31],
];

const frozen = (name: string) =>
  JSON.parse(readFileSync(`tests/fixtures/k2/text/${name}.pages.json`, "utf8")) as {
    totalPages: number;
    pages: string[];
  };

describe("frozen fixtures", () => {
  it.each(PAGE_COUNTS)("%s is frozen at %i pages", (name, pages) => {
    expect(frozen(name).totalPages).toBe(pages);
    expect(frozen(name).pages).toHaveLength(pages);
  });
});

describe("unpdf extraction", () => {
  it("extracts k2-report-2025 with its footer fingerprint intact", async () => {
    const bytes = new Uint8Array(readFileSync("tests/fixtures/k2/k2-report-2025.pdf"));
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    expect(totalPages).toBe(17);
    expect(Array.isArray(text)).toBe(true);
    expect(text[1]).toContain("K2 Base Report 3.2.28.0");
  });

  it("extracts the english report with its slash-dated footer intact", async () => {
    const bytes = new Uint8Array(readFileSync("tests/fixtures/k2/kadir-trainer-projekt.pdf"));
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    expect(totalPages).toBe(18);
    expect(text[1]).toContain("K2 Base Report 3.2.81.0");
    expect(text[1]).toContain("24/03/2026");
  });

  it("frozen texts match the live extraction page for page", async () => {
    const gold = frozen("forum2");

    const bytes = new Uint8Array(readFileSync("tests/fixtures/k2/forum2.pdf"));
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    expect(totalPages).toBe(gold.totalPages);
    expect(text).toEqual(gold.pages);
  });
});
