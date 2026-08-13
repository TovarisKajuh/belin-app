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

function loadValues(locale: string): Record<string, string> {
  const file = path.resolve(__dirname, `../messages/${locale}.json`);
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const out: Record<string, string> = {};
  for (const key of flattenKeys(raw)) {
    const value = key
      .split(".")
      .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], raw);
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/**
 * Strings that are the same in Slovenian and German or English on purpose.
 *
 * Everything here is a proper noun, a unit, a format string made only of
 * placeholders, or a word the two languages genuinely share. It is an explicit
 * list rather than a clever rule because the point is that each one was LOOKED
 * AT: this is the list the untranslated-string test is allowed to ignore.
 */
const SHARED_ON_PURPOSE = new Set([
  "common.appName",
  "dashboard.tempo",
  "dashboard.material.title",
  "landing.imprint",
  "wizard.fieldModuleType",
  "wizard.roofKwp",
  "settings.project",
  "settings.contactPhone",
  "settings.iban",
  "vault.types.freistellungsbescheinigung",
  "vault.types.unbedenklichkeitsbescheinigung",
  "notify.body.request_created",
  "notify.body.incident_created",
  "notify.body.change_order_submitted",
  "share.whatsapp",
  "po.doc.date",
  "hours.date",
  "hours.doc.project",
  "hours.doc.status",
  "hours.doc.colDate",
  "hours.doc.hoursUnit",
  "final.diaryTitleDeAt",
  "final.doc.project",
  "final.doc.colStatus",
  "final.doc.colDate",
  "final.doc.colAgreement",
  "final.dayDoc.date",
  "invoice.doc.iban",
]);

describe("message catalogs", () => {
  it("have identical key sets in sl, de and en", () => {
    const [sl, de, en] = locales.map(loadKeys);
    expect(de).toEqual(sl);
    expect(en).toEqual(sl);
  });

  // The Slovenian-first rule ships de and en carrying the Slovenian string
  // while a feature is still moving, and that debt is invisible: the catalogs
  // have the same keys and no empty values, so the older tests here passed
  // happily while the German landing page was in Slovenian. This is the test
  // that actually notices. A new placeholder makes it fail with the key name,
  // which is the reminder to translate it or to justify it above.
  it("carry no Slovenian left over in de or en", () => {
    const sl = loadValues("sl");
    const leftovers: string[] = [];
    for (const locale of ["de", "en"] as const) {
      const other = loadValues(locale);
      for (const [key, value] of Object.entries(sl)) {
        if (SHARED_ON_PURPOSE.has(key)) continue;
        if (other[key] === value) leftovers.push(`${locale}: ${key}`);
      }
    }
    expect(leftovers, "untranslated strings").toEqual([]);
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
