import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// These actions feed components that show a specific message per failure.
// In a production build only a RETURNED code survives, so each must return
// through toResult. Add an action here when a component starts decoding its codes.
const CONVERTED: Record<string, string[]> = {
  "app/[locale]/app/[projectId]/po/actions.ts": ["savePoDraftAction", "sendPoAction", "acceptPoAction", "rejectPoAction"],
  "app/[locale]/app/[projectId]/hours/actions.ts": [
    "createSheetAction", "addLineAction", "removeLineAction", "submitSheetAction",
    "decideSheetAction", "createChangeOrderAction", "decideChangeOrderAction",
  ],
  "app/[locale]/app/[projectId]/final/actions.ts": [
    "requestFinalizationAction", "generateCompletionReportAction", "startAcceptanceAction",
    "saveAcceptanceStepAction", "addDefectAction", "removeDefectAction", "saveSignatureAction",
    "signAcceptanceAction", "generateInvoiceAction", "shareInvoiceAction",
  ],
  "app/[locale]/app/[projectId]/actions.ts": ["createIncidentAction", "createRequestAction"],
  "app/[locale]/p/[token]/actions.ts": ["createIncidentAction", "createRequestAction"],
};

function body(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  const next = source.indexOf("export async function ", start + 1);
  return source.slice(start, next < 0 ? undefined : next);
}

describe("server actions behind key-decoding screens", () => {
  for (const [file, names] of Object.entries(CONVERTED)) {
    const source = readFileSync(path.resolve(__dirname, "..", file), "utf8");
    for (const name of names) {
      it(`${file} ${name} returns through toResult`, () => {
        const text = body(source, name);
        expect(text).toContain("Promise<ActionResult<");
        expect(text).toContain("toResult(");
      });
    }
  }
});
