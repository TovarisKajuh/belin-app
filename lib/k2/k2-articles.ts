// Article list extraction and selection. Pure, total, never throws.
// See lib/k2/k2-shared.ts for why nothing here imports "server-only".
import {
  parseGermanNumber,
  readBreadcrumb,
  toLines,
  type K2LineItem,
  type K2WarningCode,
} from "@/lib/k2/k2-shared";

export type ArticleScope =
  | { kind: "total" }
  | { kind: "roof"; n: number }
  | { kind: "unknown" };

export interface ArticlePage {
  pageIndex: number;
  scope: ArticleScope;
  rows: K2LineItem[];
  summeKg: number | null;
}

// "1 2003215 SingleHook 3S 36 19,1 kg"
// The name capture is lazy so the trailing quantity and weight anchor the
// split. Verified against all 41 real rows with zero partial matches.
const ROW_RE = /^(\d{1,3})\s+(\d{7})\s+(.+?)\s+(\d+(?:,\d+)?)\s+([\d.,]+)\s*kg$/;
// A line that starts like a row but does not complete: candidate for rejoining.
const ROW_START_RE = /^\d{1,3}\s+\d{7}\s+/;
const SUMME_RE = /^Summe\s+([\d.,]+)\s*kg$/;

const ROOF_CRUMB_RE = /\|\s*Dach\s+(\d+)\s*\|/;

function parseRow(line: string, position: number): K2LineItem | null {
  const m = ROW_RE.exec(line);
  if (!m) return null;

  const qty = parseGermanNumber(m[4]);
  if (qty === null) return null;

  return {
    position,
    articleNo: m[2],
    name: m[3].trim(),
    qty,
    weightKg: parseGermanNumber(m[5]),
  };
}

function readScope(lines: string[]): ArticleScope {
  const crumb = readBreadcrumb(lines);
  if (crumb === null) return { kind: "unknown" };

  const roof = ROOF_CRUMB_RE.exec(crumb);
  if (roof) return { kind: "roof", n: Number(roof[1]) };
  if (crumb === "Artikelliste") return { kind: "total" };

  return { kind: "unknown" };
}

/** Every page that carries at least one article row, in page order. */
export function extractArticleLists(pagesText: string[]): ArticlePage[] {
  if (!Array.isArray(pagesText)) return [];

  const out: ArticlePage[] = [];

  pagesText.forEach((pageText, pageIndex) => {
    const lines = toLines(pageText);
    const rows: K2LineItem[] = [];
    let summeKg: number | null = null;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      const row = parseRow(line, rows.length + 1);
      if (row) {
        rows.push(row);
        continue;
      }

      // Defensive rejoin: a line that starts like a row but does not complete
      // is retried ONCE joined with the next line. Zero occurrences in the five
      // fixtures; this guards against future name wrapping.
      if (ROW_START_RE.test(line) && i + 1 < lines.length) {
        const joined = parseRow(`${line} ${lines[i + 1]}`, rows.length + 1);
        if (joined) {
          rows.push(joined);
          i += 1;
          continue;
        }
      }

      const summe = SUMME_RE.exec(line);
      if (summe) summeKg = parseGermanNumber(summe[1]);
    }

    if (rows.length > 0) {
      out.push({ pageIndex, scope: readScope(lines), rows, summeKg });
    }
  });

  return out;
}

function renumber(items: K2LineItem[]): K2LineItem[] {
  return items.map((item, i) => ({ ...item, position: i + 1 }));
}

function sumWeights(items: K2LineItem[]): number | null {
  const known = items.filter((i) => i.weightKg !== null);
  if (known.length === 0) return null;
  return known.reduce((acc, i) => acc + (i.weightKg ?? 0), 0);
}

/**
 * Row weights are printed rounded to 0,1 kg, so the accumulated rounding error
 * grows with the row count. Anything inside this band is agreement.
 */
function weightTolerance(rowCount: number): number {
  return 0.05 * rowCount + 0.2;
}

function aggregateByArticle(items: K2LineItem[]): K2LineItem[] {
  const byArticle = new Map<string, K2LineItem>();

  for (const item of items) {
    const seen = byArticle.get(item.articleNo);
    if (!seen) {
      byArticle.set(item.articleNo, { ...item });
      continue;
    }
    seen.qty += item.qty;
    // A null weight anywhere leaves the aggregate null rather than understating it.
    seen.weightKg =
      seen.weightKg === null || item.weightKg === null
        ? null
        : Math.round((seen.weightKg + item.weightKg) * 1000) / 1000;
  }

  return renumber([...byArticle.values()]);
}

/**
 * Picks the authoritative item list out of the extracted pages.
 *
 * A project total list wins outright. Failing that, per roof lists are summed
 * per article number and flagged, because the EPC is then looking at a number
 * this parser computed rather than one K2 printed.
 */
export function selectItems(pages: ArticlePage[]): {
  items: K2LineItem[];
  warnings: K2WarningCode[];
} {
  if (!Array.isArray(pages) || pages.length === 0) {
    return { items: [], warnings: ["no_articles"] };
  }

  const warnings: K2WarningCode[] = [];

  const totals = pages.filter((p) => p.scope.kind === "total");
  const roofs = pages.filter((p) => p.scope.kind === "roof");
  const unknowns = pages.filter((p) => p.scope.kind === "unknown");

  let selected: ArticlePage[];
  let items: K2LineItem[];

  if (totals.length > 0) {
    selected = totals;
    items = renumber(totals.flatMap((p) => p.rows));
  } else if (roofs.length > 0) {
    selected = roofs;
    items = aggregateByArticle(roofs.flatMap((p) => p.rows));
    warnings.push("per_roof_fallback");
  } else if (unknowns.length > 0) {
    selected = unknowns;
    items = renumber(unknowns.flatMap((p) => p.rows));
  } else {
    return { items: [], warnings: ["no_articles"] };
  }

  if (items.length === 0) return { items: [], warnings: ["no_articles"] };

  // Integrity: the printed Summe against what the rows actually add up to.
  // A disagreement is surfaced, never fatal: the EPC still gets the list.
  const printed = selected
    .map((p) => p.summeKg)
    .filter((s): s is number => s !== null);

  if (printed.length === selected.length && printed.length > 0) {
    const printedTotal = printed.reduce((a, b) => a + b, 0);
    const rowTotal = sumWeights(items);
    if (
      rowTotal !== null &&
      Math.abs(rowTotal - printedTotal) > weightTolerance(items.length)
    ) {
      warnings.push("weight_mismatch");
    }
  }

  return { items, warnings };
}
