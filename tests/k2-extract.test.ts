// Integration test: reads a real PDF. Its only job is to detect unpdf
// extraction drift. All parsing logic is tested against the frozen texts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";

describe("unpdf extraction", () => {
  it("extracts k2-report-2025 with its footer fingerprint intact", async () => {
    const bytes = new Uint8Array(readFileSync("tests/fixtures/k2/k2-report-2025.pdf"));
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    expect(totalPages).toBe(17);
    expect(Array.isArray(text)).toBe(true);
    expect(text[1]).toContain("K2 Base Report 3.2.28.0");
  });

  it("frozen texts match the live extraction page for page", async () => {
    const frozen = JSON.parse(
      readFileSync("tests/fixtures/k2/text/forum2.pages.json", "utf8"),
    ) as { totalPages: number; pages: string[] };

    const bytes = new Uint8Array(readFileSync("tests/fixtures/k2/forum2.pdf"));
    const pdf = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    expect(totalPages).toBe(frozen.totalPages);
    expect(text).toEqual(frozen.pages);
  });
});
