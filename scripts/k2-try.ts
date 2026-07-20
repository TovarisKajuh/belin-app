// npm run k2:try -- <path to a pdf or xlsx>
//
// Drops any file on the parser and prints what it found. The point is that the
// founder or the pilot EPC can test a fresh K2 export the moment it exists,
// days before the upload wizard is built, and that a future planner vendor's
// PDF can be probed the same way.
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { parseK2Pdf } from "@/lib/k2/k2-pdf";
import { parseK2Xlsx } from "@/lib/k2/k2-xlsx";
import type { K2ParseResult, K2WarningCode } from "@/lib/k2/k2-shared";

// Slovenian, per the build-in-Slovenian mandate. This is a developer tool, so
// the strings live here rather than in the i18n catalogs.
const WARNING_SL: Record<K2WarningCode, string> = {
  no_articles: "ni seznama artiklov",
  per_roof_fallback: "sešteto po strehah",
  weight_mismatch: "teža se ne ujema",
  meta_incomplete: "manjkajo podatki o projektu",
};

function formatKg(kg: number | null): string {
  return kg === null ? "?" : `${kg.toFixed(1).replace(".", ",")} kg`;
}

function summary(r: K2ParseResult): string {
  if (!r.ok) return "Ni K2 poročilo.";

  const totalKg = r.items.reduce((acc, i) => acc + (i.weightKg ?? 0), 0);
  const version = r.metadata.reportVersion ?? "?";
  const warnings =
    r.warnings.length === 0
      ? "brez"
      : r.warnings.map((w) => WARNING_SL[w] ?? w).join(", ");

  return `K2 ${version}, ${r.items.length} artiklov, ${formatKg(totalKg)}, opozorila: ${warnings}`;
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Uporaba: npm run k2:try -- <pot do pdf ali xlsx>");
    process.exit(1);
  }

  const bytes = new Uint8Array(readFileSync(path));
  const ext = extname(path).toLowerCase();
  const result =
    ext === ".xlsx" || ext === ".xlsm"
      ? await parseK2Xlsx(bytes)
      : await parseK2Pdf(bytes);

  console.log(JSON.stringify(result, null, 2));
  console.log("");
  console.log(summary(result));
}

main().catch((err) => {
  // The parsers never throw, so anything here is a bad path or an unreadable file.
  console.error("Napaka:", err instanceof Error ? err.message : err);
  process.exit(1);
});
