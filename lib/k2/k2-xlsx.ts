// The Excel adapter: K2 Base can export its article list as a workbook, and
// three of the five sample reports carry no article list in the PDF at all, so
// this is a common path rather than an exotic one.
// Node safe, NOT "server-only" (see lib/k2/k2-shared.ts).
import ExcelJS from "exceljs";
import {
  emptyMetadata,
  parseGermanNumber,
  type K2LineItem,
  type K2ParseResult,
} from "@/lib/k2/k2-shared";

const ARTICLE_NO_RE = /^\d{7}$/;

function failed(): K2ParseResult {
  return { ok: false, metadata: emptyMetadata(), items: [], warnings: [], diagnostics: [] };
}

/** A cell's text, whatever exceljs hands back (number, string, formula, null). */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("").trim();
    }
  }
  return "";
}

function rowTexts(row: ExcelJS.Row): string[] {
  const out: string[] = [];
  // cellCount is 1 based and sparse rows are real, so index explicitly.
  for (let c = 1; c <= row.cellCount; c += 1) out.push(cellText(row.getCell(c).value));
  return out;
}

/**
 * Finds the header row by content rather than by a fixed index: a real export
 * may carry a title block above the table. Tolerant about how K2 spells the
 * article number column.
 */
function findHeader(sheet: ExcelJS.Worksheet): { rowNumber: number; cols: string[] } | null {
  let found: { rowNumber: number; cols: string[] } | null = null;

  sheet.eachRow((row, rowNumber) => {
    if (found) return;
    const cols = rowTexts(row);
    const hasArticleNo = cols.some((c) => /art.?-?nr/i.test(c));
    const hasQty = cols.some((c) => /^(anzahl|menge|qty|quantity|kolicina|količina)$/i.test(c));
    if (hasArticleNo && hasQty) found = { rowNumber, cols };
  });

  return found;
}

function columnIndex(cols: string[], test: RegExp): number {
  return cols.findIndex((c) => test.test(c));
}

/**
 * Parses a K2 article list workbook. NEVER throws: anything that is not a
 * readable workbook with an article table comes back as ok false, which the
 * wizard reads exactly like a non K2 PDF.
 */
export async function parseK2Xlsx(bytes: Uint8Array): Promise<K2ParseResult> {
  let sheet: ExcelJS.Worksheet | undefined;

  try {
    const wb = new ExcelJS.Workbook();
    // exceljs's index.d.ts opens with `declare interface Buffer extends
    // ArrayBuffer {}`, which merges into the GLOBAL Buffer type and leaves
    // load()'s parameter demanding both Node Buffer methods and ArrayBuffer's
    // resizable members: no real value can satisfy it. At runtime it wants a
    // plain Node Buffer, which is what copyBytesFrom returns. The cast is
    // confined to this one line and is a workaround for the upstream typing
    // bug, not a hole in ours.
    type LoadInput = Parameters<typeof wb.xlsx.load>[0];
    await wb.xlsx.load(Buffer.copyBytesFrom(bytes) as unknown as LoadInput);
    sheet = wb.worksheets[0];
  } catch {
    return failed();
  }

  if (!sheet) return failed();

  const header = findHeader(sheet);
  if (!header) return failed();

  const iPosition = columnIndex(header.cols, /^position$/i);
  const iArticleNo = columnIndex(header.cols, /art.?-?nr/i);
  const iName = columnIndex(header.cols, /^(artikel|article|name|naziv)$/i);
  const iQty = columnIndex(header.cols, /^(anzahl|menge|qty|quantity|kolicina|količina)$/i);
  const iWeight = columnIndex(header.cols, /^(gewicht|weight|teza|teža)$/i);

  if (iArticleNo === -1 || iQty === -1) return failed();

  const items: K2LineItem[] = [];

  for (let n = header.rowNumber + 1; n <= sheet.rowCount; n += 1) {
    const cols = rowTexts(sheet.getRow(n));

    const articleNo = cols[iArticleNo] ?? "";
    // The table ends at the first row that is not an article row: the Summe
    // row, a blank separator, or a trailing note.
    if (!ARTICLE_NO_RE.test(articleNo)) break;

    const qty = parseGermanNumber(cols[iQty] ?? "");
    if (qty === null) break;

    // The printed position is used when it is a number, otherwise the running
    // index, so a sheet without a Position column still yields ordered items.
    const printedPosition = iPosition === -1 ? null : parseGermanNumber(cols[iPosition] ?? "");
    const position = printedPosition ?? items.length + 1;

    const weightRaw = iWeight === -1 ? "" : (cols[iWeight] ?? "").replace(/\s*kg\s*$/i, "");

    items.push({
      position,
      articleNo,
      name: iName === -1 ? "" : (cols[iName] ?? ""),
      qty,
      weightKg: parseGermanNumber(weightRaw),
    });
  }

  if (items.length === 0) return failed();

  // The Excel export carries the article list and nothing else, so metadata is
  // empty by nature and the EPC fills the project fields in on the review screen.
  return {
    ok: true,
    metadata: emptyMetadata(),
    items,
    warnings: ["meta_incomplete"],
    diagnostics: ["source:xlsx"],
  };
}
