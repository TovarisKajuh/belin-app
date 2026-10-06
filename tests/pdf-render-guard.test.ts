import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A structural guard, not a behaviour test.
//
// The font subset bug (see lib/pdf/theme.tsx and DECISIONS.md 2026-08-12)
// corrupts the TEXT LAYER of any document rendered without re-registering the
// font first. It is invisible: the page looks perfect. The protection is that
// every render goes through renderDocument in lib/pdf/theme.tsx.
//
// This test fails the moment somebody adds a new document and calls
// renderToBuffer directly, which is exactly how the bug would return: nothing
// else would complain, and the damage would only show up when a customer
// copied text out of a PDF weeks later.

const ROOTS = ["app", "lib", "scripts", "components"];
const ALLOWED = ["lib/pdf/theme.tsx"];

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mjs)$/.test(full)) out.push(full);
  }
  return out;
}

describe("pdf render guard", () => {
  it("routes every render through renderDocument", () => {
    const offenders: string[] = [];

    for (const root of ROOTS) {
      for (const file of walk(root)) {
        const normalized = file.split("\\").join("/");
        if (ALLOWED.includes(normalized)) continue;

        const source = readFileSync(file, "utf8");
        if (source.includes("renderToBuffer")) offenders.push(normalized);
      }
    }

    expect(offenders).toEqual([]);
  });

  // The double-spacing bug (documents H1) returns the moment a style says a
  // unitless lineHeight without its own fontSize: it then resolves against
  // @react-pdf's 18 point default. So every style object literal under lib/pdf
  // that says lineHeight must also say fontSize. styles.body and styles.small
  // do, the brochure's styles do, and a later template (Wave 8's pilot
  // agreement, the reklamacija) may write its own as long as it does too.
  it("never sets lineHeight without fontSize in the same style object", () => {
    const offenders: string[] = [];
    for (const file of walk("lib/pdf").map((f) => f.split("\\").join("/"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\{[^{}]*lineHeight[^{}]*\}/g)) {
        if (!/fontSize/.test(match[0])) offenders.push(`${file}: ${match[0].replace(/\s+/g, " ").slice(0, 90)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the font re-registration inside the render helper", () => {
    const theme = readFileSync("lib/pdf/theme.tsx", "utf8");
    const helper = theme.slice(theme.indexOf("export async function renderDocument"));

    // The call must be INSIDE renderDocument, before the render. A module level
    // registration alone is what shipped the bug in the first place.
    expect(helper).toContain("registerDocumentFonts();");
    expect(helper.indexOf("registerDocumentFonts();")).toBeLessThan(
      helper.indexOf("return renderToBuffer"),
    );
  });
});
