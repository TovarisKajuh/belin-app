import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const locales = ["sl", "de", "en"] as const;

function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

function loadKeys(locale: string): string[] {
  const file = path.resolve(__dirname, `../messages/${locale}.json`);
  return flattenKeys(JSON.parse(readFileSync(file, "utf8"))).sort();
}

describe("message catalogs", () => {
  it("have identical key sets in sl, de and en", () => {
    const [sl, de, en] = locales.map(loadKeys);
    expect(de).toEqual(sl);
    expect(en).toEqual(sl);
  });

  it("have no empty strings", () => {
    for (const locale of locales) {
      const file = path.resolve(__dirname, `../messages/${locale}.json`);
      const raw = JSON.parse(readFileSync(file, "utf8"));
      const empties = flattenKeys(raw).filter((k) => {
        const value = k.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], raw);
        return value === "";
      });
      expect(empties, `${locale} has empty strings`).toEqual([]);
    }
  });
});
