import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";

// The catalogs are three independently written texts, not one text copied three
// times: since the single translation pass, de and en no longer carry the
// Slovenian string. That means a broken plural or a mistyped placeholder in
// German is invisible to the parity test (identical keys, non-empty strings) and
// would first show up at runtime, in the pilot language, in front of the German
// EPC. So the ICU itself is compiled here, and every argument name is compared
// against Slovenian, which is the language the code was written from.

const locales = ["sl", "de", "en"] as const;

function flatten(value: unknown, prefix = "", out: Record<string, string> = {}) {
  if (typeof value === "string") {
    out[prefix] = value;
    return out;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function load(locale: string): Record<string, string> {
  const file = path.resolve(__dirname, `../messages/${locale}.json`);
  return flatten(JSON.parse(readFileSync(file, "utf8")));
}

// Every {name} the message needs from the caller, including the ones nested
// inside plural branches. A missing one renders as a literal placeholder; an
// invented one throws at format time.
function argsOf(elements: MessageFormatElement[], out = new Set<string>()): Set<string> {
  for (const element of elements) {
    switch (element.type) {
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
        out.add(element.value);
        break;
      case TYPE.select:
      case TYPE.plural:
        out.add(element.value);
        for (const option of Object.values(element.options)) argsOf(option.value, out);
        break;
      case TYPE.tag:
        argsOf(element.children, out);
        break;
      default:
        break;
    }
  }
  return out;
}

describe("message catalogs", () => {
  it.each(locales)("compile as ICU in %s", (locale) => {
    const broken: string[] = [];
    for (const [key, message] of Object.entries(load(locale))) {
      try {
        parse(message);
      } catch (error) {
        broken.push(`${key}: ${(error as Error).message}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("take the same arguments in every language", () => {
    const sl = load("sl");
    const mismatches: string[] = [];

    for (const locale of ["de", "en"] as const) {
      const catalog = load(locale);
      for (const [key, message] of Object.entries(sl)) {
        const expected = [...argsOf(parse(message))].sort();
        const actual = [...argsOf(parse(catalog[key]))].sort();
        if (expected.join(",") !== actual.join(",")) {
          mismatches.push(`${locale} ${key}: expected [${expected}], got [${actual}]`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("never use an em dash or an en dash", () => {
    const offenders: string[] = [];
    for (const locale of locales) {
      for (const [key, message] of Object.entries(load(locale))) {
        if (/[–—]/.test(message)) offenders.push(`${locale} ${key}: ${message}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
