import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { detectK2, parseFooters } from "@/lib/k2/k2-shared";

const load = (n: string) =>
  (JSON.parse(readFileSync(`tests/fixtures/k2/text/${n}.pages.json`, "utf8")) as {
    pages: string[];
  }).pages;

// UPGRADED by the hardening plan (2026-07-20-k2-parser-hardening-plan.md):
// detectK2 now also reports the report's language, because K2 exports in the
// planner's UI language and the English variant was being rejected outright.
it("detects all four original reports with their exact versions", () => {
  expect(detectK2(load("k2-report-2025"))).toEqual({
    isK2: true,
    version: "3.2.28.0",
    lang: "de",
  });
  expect(detectK2(load("k2-report-2023"))).toEqual({
    isK2: true,
    version: "3.1.97.0",
    lang: "de",
  });
  expect(detectK2(load("forum1"))).toEqual({ isK2: true, version: "3.2.21.1", lang: "de" });
  expect(detectK2(load("forum2"))).toEqual({ isK2: true, version: "3.1.97.0", lang: "de" });
});

it("rejects the annotations document and junk", () => {
  expect(detectK2(load("k2-base-report-annotations")).isK2).toBe(false);
  expect(detectK2([])).toEqual({ isK2: false, version: null, lang: null });
  expect(detectK2(["random text", "  binary junk"]).isK2).toBe(false);
});

it("a single quoted footer inside another document cannot false positive", () => {
  const quoted = ["Some memo that quotes\nK2 Base Report 3.2.28.0 | 27.02.2025 | Foo 2/17\nand continues"];
  expect(detectK2(quoted).isK2).toBe(false);
});

it("parseFooters returns the version, ISO date and project name", () => {
  const footers = parseFooters(load("forum1"));
  expect(footers.length).toBeGreaterThan(10);
  expect(footers[0]).toEqual({
    version: "3.2.21.1",
    dateIso: "2025-01-10",
    projectName: "Bietigheim-Bissingen",
    // The separator is carried because it is the language signal.
    dateSeparator: ".",
  });
});

it("never throws on junk", () => {
  expect(() => detectK2(["", "\n\n", "K2 Base Report"])).not.toThrow();
  expect(() => parseFooters([])).not.toThrow();
});
